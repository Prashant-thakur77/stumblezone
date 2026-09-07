// The round state machine.
//
// It owns no schedule of its own — it reads the clock, asks lib/schedule what should be happening,
// and drives the rounds accordingly. That is what makes the game hostless: with nobody in the
// scene at all, the arena still cycles, and a player walking in at any instant lands mid-cycle in
// exactly the same state as everyone already there.

import { engine } from '@dcl/sdk/ecs'
import {
  slotIndex,
  slotElapsed,
  roundIndex,
  actIndex,
  phaseAt,
  seedForSlot,
  showIndex,
  isFinale,
  isGolden
} from '../lib/schedule'
import {
  INTRO_SECONDS,
  GET_READY_SECONDS,
  PLAY_SECONDS,
  ROUND_NAMES,
  SLOT_SECONDS,
  WARMUP_SECONDS,
  PODIUM_SPOTS,
  ARENA_Y,
  ARENA_CENTER_X,
  ARENA_CENTER_Z,
  SHARE_URL
} from '../config'
import { Round } from '../arena/rounds/types'
import { hud } from '../ui/state'
import { resolveBanner, roundTag } from '../lib/banner'
import * as spectator from './spectator'
import { bindSlotSource, onEliminated, onFinished, myAddress } from '../net/sync'
import {
  award,
  showStandings,
  showRank,
  syncShow,
  crownsFor,
  CROWN_SURVIVE,
  CROWN_WIN,
  CROWN_FIRST_FINISHER,
  FINALE_MULTIPLIER,
  GOLDEN_MULTIPLIER,
  setName,
  displayName,
  leader
} from '../net/crowns'
import { getPlayer, onEnterScene, onLeaveScene } from '@dcl/sdk/players'
import { triggerEmote } from '~system/RestrictedActions'
import { record, best, formatSeconds, recordFinaleWin, finaleWinCount, session } from './records'
import { announceHat, shopEntries } from './hats'
import { errandsComplete } from './errands'
import { titleFor } from '../lib/titles'
import { podiumShot, cameraSystem, setSpectatorCam } from './camera'
import { canJoinLate, secondsUntilPlay } from '../lib/join'
import { Bet } from '../lib/bet'
import { beatTheHouse, HOUSE_CROWNS } from '../lib/house'
import { HeadToHead } from '../lib/rivals'
import { towerClock } from '../arena/tower'
import { lapClock } from '../arena/lap'
import { emitGG, onGG, emitPick, onPick, emitHere, onHere, emitScore, onScore } from '../net/sync'
import { Scores } from '../lib/crownrush'
import { initPowerups, startPowerups, stopPowerups, tickPowerups } from './powerups'
import { flyover } from './camera'
import { play, setMusic, setCrowd, setCrowdLevel, say } from './audio'
import { setJumbotron, setJumbotronColor, setConfetti, flashPillars } from '../arena/scenery'
import { feed, toast } from './feed'
import { hype } from './hype'
import { Streaks } from '../lib/streak'
import { refreshCosmetics } from './cosmetics'
import { fieldLine, rivalry, nearestRival } from '../lib/field'
import { dailyFor, dailyDone, dayIndex, DAILY_CROWNS } from '../lib/daily'
import { bonusesFor } from '../lib/bonus'

let rounds: Round[] = []
let activeSlot = -1
let active: Round | null = null
let released = false
let frozen = false
let scored = false

/** Everyone we have heard from this slot, and who is out. Drives the "N still alive" line. */
let seen = new Set<string>()
let eliminated = new Set<string>()
let firstFinisher = ''
/** When the local player's run in this slot ended, in seconds into the play phase. */
let outAt = 0
/** Last whole second we played a countdown tick on, so each tick fires exactly once. */
let lastTick = -1
let saidSet = false
let saidHurry = false
/** True when we arrived after this round had already started, so nothing here counts. */
let spectatingOnly = false
/** True when we arrived mid-round but were dropped in live. Drives the one-off "joined late" line. */
let joinedLive = false
/** Seconds into play when a live latecomer arrived, for their own warm-up window. */
let joinedAtPlay = 0
/** Scored rounds: everyone's latest reported score, and when we last sent ours. */
const scores = new Scores()
let lastScoreSentAt = -Infinity
let finalScoreSent = false
/** Whom we have already replied to with our own presence this slot. */
let greeted = new Set<string>()
/** Throttle for the standing line and the hat rows: both sort or filter, neither changes often. */
let sinceLine = 1
/** Rounds won and lost against each rival this show. */
const h2h = new HeadToHead()
/** Our own finish time this round (Tip Toe), or null. */
let myFinishMs: number | null = null
/** A spectator's pick for the round, resolved at results. */
const bet = new Bet()
/** Everyone's picks this round, by picker, so the crowd favourite can go on the board. */
let picks = new Map<string, string>()
/** The player the results card would send a GG to: whoever was nearest you on the clock. */
let rivalAddress = ''
/** The FINAL TWO call fires once per round, when the field is down to two. */
let saidFinalTwo = false
/** "Past your best" fires once per round, when your time beats your personal best mid-round. */
let saidPastBest = false
/** How many players have crossed this round's finish line, for the feed's placings. */
let finishers = 0
/** While this is in the future the confetti is up because the crowd went wild, not because you won. */
let wildUntil = 0
/** Consecutive qualifications, for the star over a hot player's name tag. */
const streaks = new Streaks()
/** How long each eliminated player lasted this round, for the rivalry line. */
let outMs = new Map<string, number>()
/** The UTC day whose challenge is already paid for, so it pays once and only once. */
let dailyPaidDay = -1
/** True if the crowd hit the top of the hype meter at any point this round. */
let crowdWentWild = false
/** Whether the previous round knocked us out, for the comeback bonus. */
let wasOutLastRound = false
/** What the daily pill currently says, so the string is rebuilt only when it changes. */
let dailyShownDay = -1
let dailyShownDone = false

export function setupScheduler(roundList: Round[]): void {
  rounds = roundList
  for (const r of rounds) r.build()

  bindSlotSource(() => slotIndex(Date.now()))

  onEliminated((p, isSelf) => {
    seen.add(p.address)
    eliminated.add(p.address)
    outMs.set(p.address, p.ms)
    // Your own elimination already has a stinger, a splash and an emote. Other people's do not.
    if (!isSelf) toast(displayName(p.address) + ' is OUT')
  })
  onFinished((p, isSelf) => {
    seen.add(p.address)
    if (!firstFinisher) firstFinisher = p.address
    if (isSelf) myFinishMs = p.ms
    finishers += 1
    toast((isSelf ? 'You' : displayName(p.address)) + ' finished ' + ordinal(finishers))
  })

  const me = getPlayer()
  if (me && me.name) setName(myAddress(), me.name)

  onScore((p) => {
    seen.add(p.address)
    scores.report(p.address, p.points)
  })

  // Presence: who is in the field this round. A reply to every newcomer, once, so they learn us.
  onHere((p, isSelf) => {
    if (isSelf) return
    const wasNew = !seen.has(p.address)
    seen.add(p.address)
    if (wasNew && seen.has(myAddress()) && !greeted.has(p.address)) {
      greeted.add(p.address)
      emitHere()
    }
  })

  // Arrivals and departures are news. A room you can see filling up is a room you stay in.
  onEnterScene((p) => {
    if (!p || p.userId === myAddress()) return
    if (p.name) setName(p.userId, p.name)
    toast(displayName(p.userId) + ' joined the show')
  })
  onLeaveScene((userId) => {
    if (userId === myAddress()) return
    toast(displayName(userId) + ' left')
  })

  initPowerups()
  onPick((p, isSelf) => {
    picks.set(p.address, p.to)
    if (!isSelf) toast(displayName(p.address) + ' backs ' + displayName(p.to))
  })
  onGG((p) => {
    toast(displayName(p.address) + ' says GG')
    hype.cheer(Date.now())
    play('survive')
  })

  engine.addSystem(cameraSystem)
  engine.addSystem(schedulerSystem)
}

function beginSlot(slot: number): void {
  if (active) active.stop()
  stopPowerups()

  activeSlot = slot
  released = false
  frozen = false
  scored = false
  // The field. We join it below only if we actually play this round - a spectator on the ledge
  // is not in the field, and every payout that counts survivors depends on that.
  seen = new Set<string>()
  eliminated = new Set<string>()
  outMs = new Map<string, number>()
  firstFinisher = ''

  setConfetti(false)
  setJumbotronColor(null)
  // A new round means you are playing again, so the arena view goes away with the last one.
  setSpectatorCam(false)
  // Tell anyone who arrived since the last slot what we are wearing.
  announceHat()
  spectator.setRoundLive(false)
  spectator.resetForSlot()
  spectator.releaseInput()
  outAt = 0
  lastTick = -1
  saidSet = false
  saidHurry = false
  finishers = 0
  wildUntil = 0
  crowdWentWild = false

  syncShow(showIndex(slot))
  if (actIndex(slot) === 0) h2h.reset()

  active = rounds[roundIndex(slot)]
  spectator.setFloorY(active.floorY ?? ARENA_Y)
  active.start(seedForSlot(slot))
  startPowerups(seedForSlot(slot), { x: ARENA_CENTER_X, z: ARENA_CENTER_Z }, active.pickupRadius)
  if (isFinale(slot)) say('final_round')
  rivalAddress = ''
  myFinishMs = null
  saidFinalTwo = false
  saidPastBest = false
  hud.ggTo = ''
  hud.ggSent = false
  hud.pick = ''
  hud.candidates = []
  hud.poses = false
  picks = new Map<string, string>()

  // Name the person to beat. The board says it; saying it at the whistle makes it a rivalry.
  const lead = leader()
  if (lead !== '' && seen.size >= 1) {
    const crowns = showStandings(1)[0]?.crowns ?? 0
    if (lead === myAddress()) toast('You lead the show with ' + crowns)
    else toast((isFinale(slot) ? 'FINALE: ' : '') + displayName(lead) + ' leads the show with ' + crowns)
  }

  // Joining after the get-ready freeze. On a round whose hazards come from the clock, a latecomer
  // inside the join window is dropped straight in - a judge's first impression should be playing,
  // not a hundred seconds of "you're up next". Otherwise they spectate: dropping someone onto a
  // half-decayed board is worse than a clear wait, and it stops the alive count claiming a player
  // who never played.
  const elapsedNow = slotElapsed(Date.now())
  const joinedLate = elapsedNow > INTRO_SECONDS + GET_READY_SECONDS
  joinedLive = joinedLate && canJoinLate(elapsedNow, active.joinSafe === true)
  spectatingOnly = joinedLate && !joinedLive
  greeted = new Set<string>()
  scores.reset()
  lastScoreSentAt = -Infinity
  finalScoreSent = false
  if (!spectatingOnly) {
    seen.add(myAddress())
    emitHere()
  }
  if (joinedLive) {
    joinedAtPlay = elapsedNow - INTRO_SECONDS
    void spectator.sendTo(active.spawn())
    // Dropped onto a board mid-round: the first thing that hits you is on the house.
    spectator.addShield()
  } else if (joinedLate) {
    spectator.spectateOnly()
  } else {
    spectator.sendToLobby()
    // The establishing shot, for anyone who is here for the card.
    if (elapsedNow < 8) flyover(6)
  }
}

function schedulerSystem(dt: number): void {
  const now = Date.now()
  const slot = slotIndex(now)
  const elapsed = slotElapsed(now)
  const { phase, remaining } = phaseAt(elapsed)

  if (slot !== activeSlot) beginSlot(slot)
  if (!active) return

  // The feed changes a few times a round, not every frame; rebuilding the array is cheap but
  // handing the UI a new one every frame makes it re-render the whole corner.
  const visible = feed.visible(now)
  if (visible.length !== hud.toasts.length || visible.some((t, i) => t !== hud.toasts[i])) {
    hud.toasts = visible
  }
  hud.hype = hype.level(now)
  setCrowdLevel(hud.hype)
  // A stopwatch while the tower or the lap clock is running.
  const tower = towerClock()
  const lap = lapClock()
  hud.activity = tower !== '' ? 'TOWER ' + tower : lap !== '' ? 'LAP ' + lap : ''
  // The daily line only changes at midnight UTC or when it is cleared, so it is built then rather
  // than thirty times a second.
  const today = dayIndex(now)
  const doneToday = dailyPaidDay === today
  if (today !== dailyShownDay || doneToday !== dailyShownDone) {
    dailyShownDay = today
    dailyShownDone = doneToday
    hud.daily = doneToday ? 'DAILY: DONE' : 'DAILY: ' + dailyFor(today).text.toUpperCase()
  }
  // The crowd's own moment. Five cheers in ten seconds and the stadium answers: a roar, confetti
  // over the arena and the board saying so, for four seconds.
  if (hype.consumeWild(now)) {
    crowdWentWild = true
    play('crowd-cheer')
    flashPillars(4)
    toast('THE CROWD IS GOING WILD')
    wildUntil = now + 4000
    setConfetti(true)
  }
  if (wildUntil !== 0 && now >= wildUntil) {
    wildUntil = 0
    if (phase === 'play' || spectator.isOut()) setConfetti(false)
  }
  hud.roundName = ROUND_NAMES[roundIndex(slot)]
  hud.finale = isFinale(slot)
  // The tag counts acts ("ROUND 2 of 4"), not round ids - which round is playing is the name.
  const goldenShow = isGolden(showIndex(slot))
  hud.roundTag = (goldenShow ? 'GOLDEN SHOW  ·  ' : '') + roundTag(actIndex(slot), hud.finale)
  // A golden card, not just a golden word: the whole intro should look like the stakes changed.
  hud.golden = goldenShow
  hud.countdown = Math.ceil(remaining)
  hud.lives = spectator.livesLeft()
  hud.out = spectator.isOut()
  hud.alive = Math.max(1, seen.size - eliminated.size)
  // Names, not just a count: knowing you are down to you and Alice is the whole tension.
  const stillIn = [...seen].filter((a) => a !== myAddress() && !eliminated.has(a)).map(displayName)
  hud.fieldLine = fieldLine([...(!hud.out && !spectatingOnly ? ['you'] : []), ...stillIn])

  // Your place in the current show, twice a second - it sorts the tally, and it changes rarely.
  sinceLine += dt
  if (sinceLine >= 0.5 || hud.showLine === '') {
    sinceLine = 0
    if (hud.shop) hud.hats = shopEntries()
  const rank = showRank(myAddress())
  const title = titleFor({
    crowns: crownsFor(myAddress()),
    streak: streaks.streak(myAddress()),
    finaleWins: finaleWinCount(),
    villager: errandsComplete()
  })
  hud.showLine =
    rank.of > 0 && showStandings(1).length > 0 ? 'SHOW ' + ordinal(rank.place) + ' of ' + rank.of + '  ·  ' + title : title
  }

  // The in-world banner covers the angles the HUD does not: looking up, looking across the arena,
  // or looking down from the spectator ledge.
  if (phase === 'results' && isFinale(slot) && showStandings(1).length > 0) {
    // The finale's results are the show's: the champion's name, for the whole stadium.
    const top = showStandings(3)
    setJumbotron('SHOW CHAMPION\n' + displayName(top[0].address) + (top[1] ? '\n2nd ' + displayName(top[1].address) : '') + (top[2] ? '  3rd ' + displayName(top[2].address) : ''))
  } else {
    const fav = phase === 'play' ? crowdFavourite() : ''
    setJumbotron(hud.roundName + '\n' + (hud.banner || String(hud.countdown)) + (fav ? '\n' + fav : ''))
  }
  // The board goes gold for a Golden Show, so the stakes are visible from anywhere in the arena
  // and not only to whoever is reading the HUD.
  if (goldenShow && phase === 'intro') setJumbotronColor({ r: 1.0, g: 0.83, b: 0.25 })

  // Seconds left in the round itself, for the always-visible HUD timer.
  hud.roundClock = phase === 'play' ? Math.max(0, Math.ceil(INTRO_SECONDS + PLAY_SECONDS - elapsed)) : 0

  // The score follows the drama: lobby bed between rounds, the driving bed while playing, and a
  // faster, busier one for the last 20 seconds - landing with HURRY UP and the spinner speed-up so
  // every tension signal fires at once.
  setMusic(phase !== 'play' ? 'music-lobby' : hud.roundClock <= 20 ? 'music-tense' : 'music-round')
  // The stadium is only full while something is happening in it.
  setCrowd(phase === 'play')

  if (phase === 'intro') {
    const next = Math.ceil(INTRO_SECONDS - elapsed)
    active.tick(dt, 0, false)
    // The hint is the whole of onboarding for a first-timer, so it stays up for most of the intro
    // and only yields to the countdown in the last five seconds.
    if (next <= 5) {
      hud.phase = 'countdown'
      hud.banner = String(next)
      hud.subtitle = 'Get ready!'
      if (next !== lastTick && next > 0) {
        lastTick = next
        play('tick')
      }
    } else {
      hud.phase = 'card'
      hud.banner = active.name
      hud.subtitle = isFinale(slot)
        ? 'The show champion is decided here' + (active.twist ? '  ·  ' + active.twist : '')
        : active.hint + (active.twist ? '  ·  ' + active.twist : '')
    }
    return
  }

  if (phase === 'play') {
    const playElapsed = elapsed - INTRO_SECONDS
    // The first-visit card has done its job by the time a round starts.
    hud.welcome = false

    // The get-ready freeze. Two clients whose clocks differ by a second both spend this window
    // locked in place, which is why nothing here needs sub-second agreement.
    if (playElapsed < GET_READY_SECONDS) {
      if (!frozen) {
        frozen = true
        // Place everyone on the mark, then freeze. The lobby and the arena are separate spaces on
        // purpose - players are teleported in rather than walking, so the field always starts
        // together and nobody misses the opening seconds crossing scenery.
        void spectator.sendTo(active.spawn())
        spectator.freezeInput()
        say('ready')
      }
      if (!saidSet && GET_READY_SECONDS - playElapsed <= 2) {
        saidSet = true
        say('set')
      }
      hud.phase = 'countdown'
      hud.banner = String(Math.ceil(GET_READY_SECONDS - playElapsed))
      hud.subtitle = 'Get ready!'
      active.tick(dt, playElapsed, false)
      return
    }
    hud.phase = 'play'
    if (!released) {
      released = true
      // The whistle clock starts from the true whistle even for a latecomer released mid-round.
      spectator.setRoundLive(true, Math.round((playElapsed - GET_READY_SECONDS) * 1000))
      setJumbotronColor(null)
      if (!spectator.isOut()) {
        spectator.releaseInput()
        play('whistle')
        say('go')
      }
    }

    // Time since the whistle, the same clock every peer's `eliminated` carries.
    if (spectator.isOut() && outAt === 0) outAt = playElapsed - GET_READY_SECONDS

    if (!saidHurry && hud.roundClock > 0 && hud.roundClock <= 15) {
      saidHurry = true
      if (!spectator.isOut()) say('hurry_up')
    }

    // The warm-up beat: the first seconds of play are harmless, so a first-timer gets to look
    // around and understand the space before anything can kill them. Fall Guys teaches through
    // level design rather than text, and its levels open with a survivable stretch for exactly
    // this reason. Rounds receive `playing: false` and hold their hazards.
    // A live latecomer gets the same warm-up everyone else had, counted from their arrival.
    const warm = playElapsed < GET_READY_SECONDS + WARMUP_SECONDS || (joinedLive && playElapsed < joinedAtPlay + WARMUP_SECONDS)
    active.tick(dt, playElapsed, !warm)
    tickPowerups(playElapsed)

    // Scored rounds: our score goes out every five seconds once scoring starts, and once more,
    // final, on the first results frame. Our own tally is fed from the same emits, so every
    // client - this one included - settles from the numbers that were actually shared.
    if (active.scored && active.score && !spectator.isOut() && !spectatingOnly) {
      if (playElapsed - lastScoreSentAt >= 5 && playElapsed >= GET_READY_SECONDS + WARMUP_SECONDS) {
        lastScoreSentAt = playElapsed
        const mine = active.score()
        scores.report(myAddress(), mine)
        emitScore(mine)
      }
    }

    // Solo or not, a personal best is a moment: say it the second you pass it, not at the end.
    if (!saidPastBest && !spectator.isOut() && !spectatingOnly) {
      const pb = best(hud.roundName)
      if (pb > 0 && pb < PLAY_SECONDS * 1000 && playElapsed * 1000 > pb) {
        saidPastBest = true
        toast('PAST YOUR BEST - ' + formatSeconds(pb))
        play('survive')
      }
    }

    // Two left, with someone beaten: the round has a last act, and the board should say so.
    if (!saidFinalTwo && seen.size >= 3 && seen.size - eliminated.size === 2) {
      saidFinalTwo = true
      const two = [...seen].filter((a) => !eliminated.has(a)).map(displayName)
      toast('FINAL TWO: ' + two.join(' vs '))
      setJumbotronColor({ r: 1.0, g: 0.24, b: 0.62 })
      play('whistle')
    }

    // A spectator's stake: pick one of the players still in. One pick, then it is a watch.
    if (spectator.isOut()) {
      const picked = bet.picked(slot)
      hud.pick = picked === '' ? '' : displayName(picked)
      if (picked === '') {
        const alive = [...seen].filter((a) => a !== myAddress() && !eliminated.has(a)).slice(0, 4)
        if (alive.length !== hud.candidates.length || alive.some((a, i) => hud.candidates[i]?.address !== a)) {
          hud.candidates = alive.map((a) => ({ address: a, name: displayName(a) }))
        }
      } else if (hud.candidates.length > 0) {
        hud.candidates = []
      }
    }
    if (warm) {
      hud.banner = ''
      hud.subtitle = active.hint
    }
    // A latecomer who was dropped in live gets the hint for a few seconds, since they skipped the
    // intro card that everyone else read.
    if (joinedLive && playElapsed < GET_READY_SECONDS + WARMUP_SECONDS + 6) {
      hud.banner = 'JOINED LATE - GO!'
      hud.subtitle = active.hint
    }
    // A latecomer on the ledge is told exactly how long the wait is, every second of it.
    if (spectatingOnly) {
      hud.banner = 'NEXT ROUND IN ' + Math.ceil(secondsUntilPlay(elapsed)) + 's'
      hud.subtitle = 'You arrived mid-round - watch from the ledge, you are in for the next one'
    }

    // Rounds write whatever suits their own state machine; this has the final word, so no round
    // can tell an eliminated player they are still doing well.
    const resolved = resolveBanner({
      out: spectator.isOut(),
      spectatingOnly,
      banner: hud.banner,
      subtitle: hud.subtitle
    })
    hud.banner = resolved.banner
    hud.subtitle = resolved.subtitle
    return
  }

  // Results. A scored round sends its final score on the first results frame - play is over, the
  // number is final - and waits a beat for everyone else's before it settles.
  const isScored = active.scored === true && !!active.score
  if (!scored && isScored && !finalScoreSent) {
    finalScoreSent = true
    if (!spectator.isOut() && !spectatingOnly) {
      const mine = active.score!()
      scores.report(myAddress(), mine)
      emitScore(mine)
    }
    hud.resultDetail = 'Counting scores...'
  }
  if (!scored && (!isScored || elapsed >= INTRO_SECONDS + PLAY_SECONDS + 1.5)) {
    scored = true
    spectator.setRoundLive(false)
    // A scored round has no eliminations: "qualified" means you scored. Elsewhere it means alive.
    const myPoints = isScored ? scores.get(myAddress()) : 0
    const scoredWinner = isScored ? scores.leader().address : ''
    const survived = isScored ? myPoints > 0 : !spectator.isOut()
    const golden = isGolden(showIndex(slot))
    const stakes = (isFinale(slot) ? FINALE_MULTIPLIER : 1) * (golden ? GOLDEN_MULTIPLIER : 1)
    if (survived && !spectatingOnly) {
      award(myAddress(), CROWN_SURVIVE * stakes)
      // Sole survivor takes the round. Requires someone to have been beaten - surviving alone is
      // worth a crown, but it is not a win.
      if (seen.size > 1 && eliminated.size === seen.size - 1) {
        award(myAddress(), CROWN_WIN * stakes)
        session.won()
      }
    }
    if (firstFinisher === myAddress()) award(myAddress(), CROWN_FIRST_FINISHER * stakes)
    // A scored round's winner: the top score, if anyone else reported one.
    if (isScored && !spectatingOnly && scoredWinner === myAddress() && scores.size() > 1) {
      award(myAddress(), CROWN_WIN * stakes)
      session.won()
    }

    // Bonuses. Each is announced by name, because a crown that arrives without a reason is just a
    // number going up.
    const bonuses = spectatingOnly
      ? []
      : bonusesFor({
          survived,
          livesLeft: spectator.livesLeft(),
          wasOutLastRound,
          crowdWentWild,
          stakes
        })
    for (const bonus of bonuses) {
      award(myAddress(), bonus.crowns)
      toast(bonus.label + '  +' + bonus.crowns)
    }
    if (!spectatingOnly) {
      wasOutLastRound = !survived
      session.round(survived)
    }

    // The daily. Paid once per UTC day, on the first round that clears it.
    if (!spectatingOnly && dailyPaidDay !== dayIndex(now)) {
      const cleared = dailyDone(dailyFor(dayIndex(now)), {
        roundId: roundIndex(slot),
        survived: !spectator.isOut(),
        first: firstFinisher === myAddress(),
        survivedMs: Math.round((!spectator.isOut() ? PLAY_SECONDS : outAt) * 1000)
      })
      if (cleared) {
        dailyPaidDay = dayIndex(now)
        award(myAddress(), DAILY_CROWNS)
        toast('DAILY CHALLENGE DONE  +' + DAILY_CROWNS)
        play('crown')
      }
    }

    // Streaks and worn cosmetics. Everyone we saw this round either went down or came through,
    // and the same computation runs on every client from the same messages.
    for (const address of seen) {
      if (address === myAddress() && spectatingOnly) continue
      if (eliminated.has(address)) streaks.eliminated(address)
      else {
        streaks.qualified(address)
        // Three in a row is a story the whole room should hear.
        if (streaks.streak(address) === 3) toast((address === myAddress() ? 'You are' : displayName(address) + ' is') + ' ON FIRE - three in a row')
      }
    }
    refreshCosmetics(leader(), streaks.hot())
    // The stinger and the crowd's verdict, before any announcer line.
    if (spectatingOnly) {
      // Watched, did not play: no fanfare and no groan for you.
    } else if (survived) {
      play('qualified')
      play('crowd-cheer')
      // A fist pump on the spot. Everyone still standing celebrates at the same instant, which is
      // what makes a results screen look like a room rather than a scoreboard.
      void triggerEmote({ predefinedEmote: 'fistpump' })
    } else {
      play('crowd-aww')
    }
    setConfetti(survived)

    const survivedMs = Math.round((survived ? PLAY_SECONDS : outAt) * 1000)
    // A round you watched is not a round you played - it must not set a personal best. A scored
    // round's best is a score, kept by the same store under a points key.
    const beatIt = spectatingOnly ? false : isScored ? record(hud.roundName + ' points', Math.round(myPoints * 1000)) : record(hud.roundName, survivedMs)

    // One announcer line per result, most specific wins: a sole-survivor win beats a new best,
    // which beats plain qualification. The eliminated heard "you lose" when they fell.
    const onPodium = isFinale(slot) && showStandings(3).some((s) => s.address === myAddress())
    if (!spectatingOnly && !onPodium && isScored) {
      if (scoredWinner === myAddress() && scores.size() > 1) say('congratulations')
      else if (myPoints === 0) say('game_over')
      else if (beatIt) say('new_highscore')
    } else if (!spectatingOnly && !onPodium) {
      const wonOutright = survived && seen.size > 1 && eliminated.size === seen.size - 1
      if (wonOutright) say('congratulations')
      else if (survived && beatIt) say('new_highscore')
      else if (survived) say('you_win')
      else say('game_over')
    }
    hud.resultDetail = spectatingOnly
      ? 'You watched this one. You are in for the next.'
      : isScored
        ? scoredResultLine(myPoints, scoredWinner, beatIt)
      : seen.size > 1
      ? (survived ? '+1 crown' : eliminated.size + ' of ' + seen.size + ' went down')
      : beatIt
        ? 'New best! ' + formatSeconds(survivedMs)
        : formatSeconds(survivedMs) + '  ·  best ' + formatSeconds(best(hud.roundName))

    // The house: the opponent who is always there. Paid and printed like any other bonus.
    if (!spectatingOnly) {
      const house = beatTheHouse(roundIndex(slot), survived, survivedMs, myFinishMs, myPoints)
      if (house.beaten) {
        award(myAddress(), HOUSE_CROWNS * stakes)
        toast('BEAT THE HOUSE  +' + HOUSE_CROWNS * stakes)
        play('crown')
      }
      if (house.label !== '') hud.resultDetail += '  ·  ' + house.label
    }

    // Bonuses go on the splash as well as in the feed - the splash is what a player screenshots.
    if (bonuses.length > 0) hud.resultDetail += '  ·  ' + bonuses.map((b) => b.label).join(' + ')

    // The spectator's pick, settled by the same messages everyone saw. On a scored round the
    // "survivor" is the winner, outright.
    const survivors = isScored && scoredWinner !== '' ? [scoredWinner] : [...seen].filter((a) => !eliminated.has(a))
    const settled = bet.resolve(slot, survivors, survivors.length === 1 && seen.size > 1)
    if (settled) {
      if (settled.crowns > 0) {
        award(myAddress(), settled.crowns * stakes)
        play('crown')
      }
      toast(settled.label + (settled.crowns > 0 ? '  +' + settled.crowns * stakes : ''))
    }
    hud.candidates = []

    // The round's MVP, for the feed: the outright winner, else the first finisher, else nobody.
    if (seen.size > 1) {
      const mvp = survivors.length === 1 ? survivors[0] : firstFinisher
      if (mvp !== '') toast('MVP: ' + (mvp === myAddress() ? 'you' : displayName(mvp)))
    }

    // One named comparison beats any number of seconds. Whoever finished nearest you on the clock
    // is the person you will talk to about this round.
    if (!spectatingOnly && seen.size > 1) {
      const others = [...seen]
        .filter((a) => a !== myAddress())
        .map((a) => ({ name: displayName(a), outMs: outMs.get(a) ?? null, address: a }))
      const me = { name: 'you', outMs: survived ? null : Math.round(outAt * 1000) }
      const line = rivalry(me, others)
      if (line !== '') hud.resultDetail += '  ·  ' + line
      // The GG and the head-to-head go to the same person the line named.
      const near = nearestRival(me, others)
      if (near && near.rival.address) {
        rivalAddress = near.rival.address
        hud.ggTo = displayName(rivalAddress)
        h2h.record(rivalAddress, near.beaten)
        const score = h2h.score(rivalAddress)
        if (score !== '') hud.resultDetail += '  ·  vs ' + displayName(rivalAddress) + ' this show: ' + score
      }
    }

    spectator.releaseInput()

    // The cycle's celebration peak: after the finale, the podium. Each client moves only itself -
    // rank comes from the shared crown tally, so every client agrees who stands where and everyone
    // sees the same three avatars arrive on the steps.
    const cycleEnd = isFinale(slot)
    // The end of a show is where a visit gets summed up, win or lose.
    if (cycleEnd && !spectatingOnly) hud.resultDetail += '  ·  ' + session.summary()
    const rank = cycleEnd ? showStandings(3).findIndex((s) => s.address === myAddress()) : -1
    if (rank >= 0) {
      const spot = PODIUM_SPOTS[rank]
      void spectator.sendTo({ x: spot.x, y: spot.y, z: spot.z })
      void triggerEmote({ predefinedEmote: rank === 0 ? 'raiseHand' : 'clap' })
      if (rank === 0) recordFinaleWin()
      setConfetti(true)
      play('crown')
      say('congratulations')
      // The one moment somebody is most likely to tell a friend about this is the moment they win.
      if (rank === 0) hud.resultDetail = 'SHOW CHAMPION  ·  Bring a friend: ' + SHARE_URL + '  ·  ' + hud.resultDetail
    } else {
      spectator.sendToLobby()
    }

    // The curtain call. Everyone gets the shot, not only the three on the steps - the point of a
    // podium is that the room is looking at it.
    if (cycleEnd) {
      podiumShot()
      // Then the encore: fifteen seconds where everyone's pose buttons are open and the podium
      // is a dance floor. A show should end with people dancing, not reading a card.
      hud.poses = true
      toast('ENCORE - everyone dance')
    }
  }

  active.tick(dt, SLOT_SECONDS, false)
  // The encore outranks whatever the round's tick thinks about the pose row.
  if (isFinale(slot)) hud.poses = true
  // "QUALIFIED" is the party-game word, and it lands harder than "survived" - it says you are
  // through to something, not merely that you are not dead.
  hud.phase = 'results'
  // A mid-round joiner watched, so they were neither. The card tells them what happens next.
  hud.banner = spectatingOnly
    ? 'NEXT ROUND'
    : isScored
      ? !scored
        ? 'ROUND OVER'
        : scores.leader().address === myAddress() && scores.size() > 1
          ? 'WINNER!'
          : scores.get(myAddress()) > 0
            ? 'ROUND OVER'
            : 'NO POINTS'
      : spectator.isOut()
        ? 'ELIMINATED'
        : 'QUALIFIED!'
  hud.subtitle = hud.resultDetail + '  ·  NEXT: ' + ROUND_NAMES[roundIndex(slot + 1)] + ' in ' + Math.ceil(remaining) + 's'
}

/** A spectator picks who wins. */
export function pickWinner(address: string): void {
  bet.choose(address, activeSlot)
  toast('You picked ' + displayName(address))
  play('tick')
  emitPick(address)
}

/** "CROWD BACKS Alice x3", or '' when nobody has picked. */
function crowdFavourite(): string {
  if (picks.size === 0) return ''
  const counts = new Map<string, number>()
  for (const to of picks.values()) counts.set(to, (counts.get(to) ?? 0) + 1)
  let best = ''
  let n = 0
  for (const [a, c] of counts) if (c > n) { best = a; n = c }
  return 'CROWD BACKS ' + displayName(best) + (n > 1 ? ' x' + n : '')
}

/** Send a GG to the rival on the results card. Once per round. */
export function sendGG(): void {
  if (rivalAddress === '' || hud.ggSent) return
  hud.ggSent = true
  emitGG(rivalAddress)
  toast('GG sent to ' + displayName(rivalAddress))
}

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return n + suffix
}

/** The results line for a scored round. */
function scoredResultLine(myPoints: number, winner: string, newBest: boolean): string {
  const mine = 'Your score ' + Math.floor(myPoints) + (newBest ? ' - new best' : '')
  if (winner === '') return mine
  return mine + '  ·  winner ' + (winner === myAddress() ? 'you' : displayName(winner)) + ' with ' + Math.floor(scores.get(winner))
}

/** A round's twist line by name, for the host. */
export function roundTwist(name: string): string | undefined {
  return rounds.find((r) => r.name === name)?.twist
}

/** What is coming up, for the lobby schedule sign. */
export function upcoming(count = 3): { name: string; inSeconds: number }[] {
  const now = Date.now()
  const slot = slotIndex(now)
  const elapsed = slotElapsed(now)
  const out: { name: string; inSeconds: number }[] = []
  for (let i = 1; i <= count; i++) {
    out.push({
      name: ROUND_NAMES[roundIndex(slot + i)],
      inSeconds: Math.round(i * SLOT_SECONDS - elapsed)
    })
  }
  return out
}
