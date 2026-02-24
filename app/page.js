/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Check, Info, RotateCcw, Users, ChevronRight, Share2 } from 'lucide-react'

// ————————————————————————————————————————————————————————
// ROUND DATA (matches what's in your Supabase rounds table)
// ————————————————————————————————————————————————————————

const ROUNDS_DATA = [
  {
    id: 'round-1',
    number: 1,
    title: 'Best Vacation Beach Scene',
    ai_pick: 'a',
    ai_model: 'GPT 5.2',
    ai_reasoning: "This photo has immediate, calming beach appeal with bright turquoise water, a sailboat, soft sand, and dramatic white clouds. The colors pop strongly and the composition is clean and easy to process at a glance. It delivers relaxation and wanderlust without requiring context.",
    photos: [
      { id: 'a', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-1/a.jpg" },
      { id: 'b', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-1/b.jpg" },
      { id: 'c', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-1/c.jpg" },
      { id: 'd', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-1/d.jpg" }
    ]
  },
  {
    id: 'round-2',
    number: 2,
    title: 'Best Primate Animal Portrait',
    ai_pick: 'a',
    ai_model: 'GPT 5.2',
    ai_reasoning: "The baby gorilla chewing on a stick with a large adult behind it instantly triggers a protective, heartwarming response that consistently performs well with broad audiences. The eye contact and expressive face create immediate connection, and the lush green surroundings add vibrant contrast. It feels intimate, heartwarming, and highly shareable.",
    photos: [
      { id: 'a', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-2/a.jpg" },
      { id: 'b', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-2/b.jpg" },
      { id: 'c', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-2/c.jpg" },
      { id: 'd', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-2/d.jpg" }
    ]
  },
  {
    id: 'round-3',
    number: 3,
    title: 'Best Seasonal Nature Scene',
    ai_pick: 'c',
    ai_model: 'GPT 5.2',
    ai_reasoning: "The autumn park scene with the geese has the strongest stopping power. Vibrant orange and yellow foliage, a clear subject in the foreground with wings spread, and a calm reflective pond create instant warmth and seasonal nostalgia. The composition feels lively yet serene, both eye-catching and emotionally comforting.",
    photos: [
      { id: 'a', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-3/a.jpg" },
      { id: 'b', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-3/b.jpg" },
      { id: 'c', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-3/c.jpg" },
      { id: 'd', src: "https://wiqrvcnylhmiccjuovjm.supabase.co/storage/v1/object/public/photos/round-3/d.jpg" }
    ]
  }
]

// ————————————————————————————————————————————————————————
// UTILITY FUNCTIONS
// ————————————————————————————————————————————————————————

function seededShuffle(array, seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash = hash & hash
  }
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) & 0xffffffff
    const j = ((hash >>> 0) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getTiedLeaders(voteCounts) {
  const entries = Object.entries(voteCounts || {}).filter(([_, v]) => typeof v === 'number' && v > 0)
  if (entries.length === 0) return []
  const maxVotes = Math.max(...entries.map(([_, v]) => v))
  return entries.filter(([_, v]) => v === maxVotes).map(([id]) => id).sort()
}

function getCrowdFavorite(voteCounts) {
  const leaders = getTiedLeaders(voteCounts)
  if (leaders.length !== 1) return null
  return leaders[0]
}

function isAmongLeaders(photoId, voteCounts) {
  return getTiedLeaders(voteCounts).includes(photoId)
}

function getPercentage(photoId, voteCounts) {
  const counts = voteCounts || {}
  const total = Object.values(counts).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
  if (total === 0) return 0
  return Math.round(((counts[photoId] || 0) / total) * 100)
}

function getTotalVotes(voteCounts) {
  return Object.values(voteCounts || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
}

function formatPhotoList(letters) {
  if (letters.length === 1) return `Photo ${letters[0]}`
  if (letters.length === 2) return `Photos ${letters[0]} and ${letters[1]}`
  return `Photos ${letters.slice(0, -1).join(', ')}, and ${letters[letters.length - 1]}`
}

// ————————————————————————————————————————————————————————
// REPORT CARD LOGIC
// ————————————————————————————————————————————————————————

function getReportCard({
  userPick, aiPick, crowdFav, tiedLeaders,
  userPct, crowdFavPct, crowdFavLetter, aiPickLetter,
  tiedLeaderLetters, tiedPct,
  userAmongLeaders, aiAmongLeaders
}) {
  const isTied = crowdFav === null && tiedLeaders.length > 1

  if (!isTied) {
    const matchedCrowd = userPick === crowdFav
    const matchedAi = userPick === aiPick
    const aiCorrect = aiPick === crowdFav

    const personalLine = matchedCrowd
      ? "You picked the crowd favorite."
      : `You went a different direction. Only ${userPct}% agreed with you.`

    let aiConnectionLine
    if (matchedCrowd && matchedAi) {
      aiConnectionLine = "So did AI. All three converged this round."
    } else if (matchedCrowd && !matchedAi) {
      aiConnectionLine = `AI picked something different. It predicted Photo ${aiPickLetter} would be the most popular.`
    } else if (!matchedCrowd && matchedAi) {
      aiConnectionLine = "Interestingly, AI picked the same photo you did. But the crowd went elsewhere."
    } else if (!matchedCrowd && !matchedAi && aiCorrect) {
      aiConnectionLine = `AI predicted Photo ${crowdFavLetter} would be the most popular.`
    } else {
      aiConnectionLine = `AI predicted Photo ${aiPickLetter}. The crowd picked something else entirely.`
    }

    const verdictLine = `The crowd picked Photo ${crowdFavLetter} with ${crowdFavPct}% of the vote. AI got it ${aiCorrect ? 'right' : 'wrong'}.`
    const closingLine = aiCorrect
      ? "This round, AI could predict what humans find beautiful."
      : "This round, it couldn't."

    return { personalLine, aiConnectionLine, verdictLine, aiCorrect, closingLine, isTied: false }
  }

  const tiedListStr = formatPhotoList(tiedLeaderLetters)
  const matchedAi = userPick === aiPick

  let personalLine
  if (userAmongLeaders) {
    personalLine = "The crowd was split this round, but your pick was one of the tied leaders."
  } else {
    personalLine = `The crowd was split this round. Only ${userPct}% agreed with you.`
  }

  let aiConnectionLine
  if (userAmongLeaders && aiAmongLeaders && matchedAi) {
    aiConnectionLine = "AI picked the same photo you did. You both landed on one of the top choices."
  } else if (userAmongLeaders && aiAmongLeaders && !matchedAi) {
    aiConnectionLine = "AI also picked a tied leader, but a different one."
  } else if (userAmongLeaders && !aiAmongLeaders) {
    aiConnectionLine = `AI predicted Photo ${aiPickLetter}, which wasn't among the leaders.`
  } else if (!userAmongLeaders && aiAmongLeaders) {
    aiConnectionLine = `AI predicted Photo ${aiPickLetter}, one of the tied leaders.`
  } else {
    aiConnectionLine = `AI predicted Photo ${aiPickLetter}. It wasn't among the leaders either.`
  }

  const verdictLine = `${tiedListStr} tied at ${tiedPct}% each. AI ${aiAmongLeaders ? 'picked a tied leader' : 'got it wrong'}.`
  const closingLine = aiAmongLeaders
    ? "This round, the crowd was split, but AI was in the mix."
    : "This round, the crowd was split and AI missed entirely."

  return {
    personalLine, aiConnectionLine, verdictLine,
    aiCorrect: aiAmongLeaders,
    closingLine,
    isTied: true
  }
}

// ————————————————————————————————————————————————————————
// AI SCORECARD (results page)
// ————————————————————————————————————————————————————————

function getAiScorecard(aiAccuracy) {
  if (aiAccuracy === 3) return { text: "AI predicted the crowd favorite every round. It could see exactly what humans find beautiful.", dot: '#3A7D44', bg: 'rgba(58,125,68,0.04)' }
  if (aiAccuracy === 2) return { text: "AI predicted the crowd favorite 2 out of 3 times. It could mostly read the room.", dot: '#3A7D44', bg: 'rgba(58,125,68,0.04)' }
  if (aiAccuracy === 1) return { text: "AI predicted the crowd favorite once. It mostly couldn't see what humans see.", dot: '#A8A8A8', bg: '#F8F7F4' }
  return { text: "AI didn't predict the crowd favorite a single time. Whatever drew people to the winning photo, the algorithm couldn't detect it.", dot: '#C0392B', bg: 'rgba(192,57,43,0.03)' }
}

// ————————————————————————————————————————————————————————
// TASTE TYPE CLASSIFICATION
// ————————————————————————————————————————————————————————

function getTasteType(crowdMatches, aiMatches) {
  if (aiMatches === 3 && crowdMatches <= 1) return 'machine-eye'
  if (aiMatches === 2 && crowdMatches <= 1) return 'digital-eye'
  if (crowdMatches >= 2 && aiMatches === 0) return 'human-element'
  if (crowdMatches === 3) return 'perfect-read'
  if (crowdMatches === 2) return 'mainstream-eye'
  if (crowdMatches === 1) return 'against-grain'
  return 'outlier'
}

const TASTE_CONTENT = {
  'perfect-read': {
    typeName: 'The Perfect Read', headline: 'Three for three.', accent: '#C9A84C', bg: 'from-[#1C1C28] to-[#2A2A3C]',
    description: "You didn't hesitate, did you? Every round, you looked at four photos and your eye went to the exact same one that most people chose. That's not luck over three rounds. That's something about how you're wired.",
    detail: "Here's what's interesting. You weren't following anyone. You couldn't see what other people picked. You arrived at the same place completely independently, three times in a row. Whatever most people respond to in an image (balance, warmth, a clear subject) you respond to it too, instinctively. You don't just have good taste. You have default taste. The question is whether that's a compliment or not. It is."
  },
  'mainstream-eye': {
    typeName: 'The Mainstream Eye', headline: 'You see what most people see. Almost.', accent: '#C9A84C', bg: 'from-[#1C1C28] to-[#2A2A3C]',
    description: "Two out of three rounds, your pick was the crowd favorite. You're tuned into whatever it is that draws most people to an image. Light, composition, emotional clarity. But one round, you broke from it. You looked at the same four photos everyone else saw and your eye landed somewhere different.",
    detail: "That one break is the most interesting thing about your result. It means your taste isn't on autopilot. You share the majority instinct most of the time, but there's a specific register (maybe a mood, a texture, a kind of image) where you diverge. You're not predictable. You're mostly predictable. And that \"mostly\" is where your actual taste lives."
  },
  'against-grain': {
    typeName: 'Against the Grain', headline: 'The crowd goes left. You go right.', accent: '#E07A5F', bg: 'from-[#1C1C28] to-[#2E2438]',
    description: "Only once across three rounds did you pick the same photo as the majority. The rest of the time, your eye landed on something most people scrolled past. The image that got 10% or 15% of the vote while something else dominated.",
    detail: "This doesn't mean you have bad taste. It might mean you have more specific taste. You're probably responding to something most people don't consciously notice. An unusual crop, a quieter mood, a detail in the corner that rewards a longer look. Popularity measures the average. You're not the average. Whether that's an edge or an inconvenience depends on whether you're curating a gallery or choosing a restaurant."
  },
  'outlier': {
    typeName: 'The Outlier', headline: 'Nobody picked what you picked.', accent: '#E07A5F', bg: 'from-[#1C1C28] to-[#32202A]',
    description: "Three rounds. Three chances to agree with the crowd. You matched zero times. When the majority went one direction, you were somewhere else entirely. Not once, but consistently.",
    detail: "There are two ways to read this. One: you're genuinely seeing something in these images that most people miss. You're drawn to subtlety, strangeness, the photo that doesn't try to be liked. Two: you might just be wired differently. Not better or worse, just differently. Most aesthetic research assumes people converge. You're evidence that they don't always. You're the reason this experiment is interesting."
  }
}

function getMachineEyeContent(crowdMatches) {
  return {
    typeName: 'The Machine Eye', headline: 'You see what the algorithm sees.', accent: '#7C6BDB', bg: 'from-[#1C1C28] to-[#1E1E38]',
    description: crowdMatches === 0
      ? "Every round, you and AI picked the same photo. Same image, same instinct, independently. You from whatever you feel when you look at a photo, AI from whatever patterns it's learned from millions of images. The crowd? They went somewhere else every single time. Neither of you matched the majority once."
      : "Every round, you and AI picked the same photo. Same image, same instinct, independently. You matched the crowd once, but it was AI you were consistently aligned with. Three for three with the machine.",
    detail: "You're not aligned with the majority. You're aligned with the model. That probably means you're drawn to the same things AI optimizes for: technical clarity, strong composition, high contrast, obvious focal points. These are the \"objectively good\" qualities of an image. The crowd often picks something warmer, messier, more human. You pick what's correct. Whether that makes you more perceptive or less emotional is the question this result doesn't answer."
  }
}

function getDigitalEyeContent(crowdMatches) {
  return {
    typeName: 'The Digital Eye', headline: 'You and the algorithm are on the same wavelength.', accent: '#7C6BDB', bg: 'from-[#1C1C28] to-[#1E1E38]',
    description: crowdMatches === 0
      ? "Two out of three rounds, you picked the same photo as AI. Not because you saw its answers. You couldn't. You just looked at four photos and your eye went to the same place the algorithm's did. The crowd? They went somewhere else. You and AI are seeing something most people aren't."
      : "Two out of three rounds, you and AI chose the same photo independently. You matched the crowd once, but your real alignment was with the machine. That's not a coincidence over two rounds. That's a pattern.",
    detail: "You're not quite The Machine Eye (that requires a perfect three-for-three with AI), but you're close. Two out of three means your visual instincts overlap significantly with what the model was trained to detect: strong composition, clarity, technical precision. The one round where you broke from AI might be the most interesting. That's where your human judgment overrode the algorithmic one. What did you see that the model didn't? Or what did you feel that it can't?"
  }
}

function getHumanElementContent(crowdMatches) {
  return {
    typeName: 'The Human Element', headline: "You see something AI can't.", accent: '#3A7D44', bg: 'from-[#1C1C28] to-[#1E2E28]',
    description: crowdMatches === 3
      ? "Three for three. You picked the crowd favorite every round. You're clearly tuned into whatever makes an image resonate with people. But AI never agreed with you. Not once. The machine looked at the same photos and picked something completely different every round."
      : "Two out of three rounds, you picked the crowd favorite. You're tuned into what resonates with people. But here's the interesting part: AI never agreed with you. Not once. Whatever you and the crowd are responding to, the algorithm can't see it.",
    detail: "This is a fascinating result. You and the crowd are responding to the same thing, but it's invisible to the algorithm. It might be warmth. It might be narrative, the sense that something is happening in the photo, not just being displayed. It might be nostalgia, or comfort, or a feeling you can't name. Whatever it is, it's human. It's shared. And it's the thing that makes aesthetic preference more than just pattern recognition. You're proof that taste isn't computable. At least not yet."
  }
}

// ————————————————————————————————————————————————————————
// LOGO COMPONENT
// ————————————————————————————————————————————————————————

function LogoSection({ size = "w-12 h-12" }) {
  return (
    <svg viewBox="0 0 100 100" className={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="35" stroke="black" strokeWidth="1.5" />
      <path d="M50 50 L15 50 A35 35 0 0 1 50 15 Z" fill="#2B7FFF" />
      <line x1="5" y1="50" x2="95" y2="50" stroke="black" strokeWidth="0.7" />
      <line x1="50" y1="5" x2="50" y2="95" stroke="black" strokeWidth="0.7" />
    </svg>
  )
}

// ————————————————————————————————————————————————————————
// MAIN PAGE COMPONENT
// ————————————————————————————————————————————————————————

export default function Page() {
  const [visitorId, setVisitorId] = useState(null)
  const [deviceId, setDeviceId] = useState(null)
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [selections, setSelections] = useState({})
  const [voteCounts, setVoteCounts] = useState({})
  const [sessionComplete, setSessionComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [voteError, setVoteError] = useState(false)
  const [visitorMeta, setVisitorMeta] = useState({})
  const roundStartTime = useRef(Date.now())

  useEffect(() => {
    // device_id: permanent, never changes, identifies the physical device
    let dId = localStorage.getItem('htl_device_id')
    if (!dId) {
      dId = crypto.randomUUID()
      localStorage.setItem('htl_device_id', dId)
    }
    setDeviceId(dId)

    // visitor_id: session-based, changes on restart, groups one playthrough
    let id = localStorage.getItem('htl_visitor_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('htl_visitor_id', id)
    }
    setVisitorId(id)

    // Detect device type and timezone (no external API needed)
    const ua = navigator.userAgent || ''
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    const meta = { device_type: isMobile ? 'mobile' : 'desktop', user_agent: ua.slice(0, 500), timezone: tz, country: null, region: null, referrer: document.referrer || null }

    // Try free geo API for country/region (fails silently if blocked)
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        meta.country = data.country_name || data.country || null
        meta.region = data.region || null
        setVisitorMeta({ ...meta })
      })
      .catch(() => {
        setVisitorMeta({ ...meta })
      })

    setVisitorMeta(meta)
  }, [])

  useEffect(() => {
    if (!visitorId) return
    async function loadData() {
      const { data: allVotes, error } = await supabase
        .from('votes')
        .select('round_id, photo_id, visitor_id')

      if (error) {
        console.error('Supabase connection error:', error.message)
      }
      console.log(`HTL: Loaded ${allVotes?.length || 0} votes from Supabase`)
      const counts = {}
      allVotes?.forEach(vote => {
        if (!counts[vote.round_id]) counts[vote.round_id] = { a: 0, b: 0, c: 0, d: 0 }
        counts[vote.round_id][vote.photo_id] = (counts[vote.round_id][vote.photo_id] || 0) + 1
      })
      setVoteCounts(counts)
      const myVotes = allVotes?.filter(v => v.visitor_id === visitorId) || []
      if (myVotes.length > 0) {
        const saved = {}
        myVotes.forEach(v => { saved[v.round_id] = v.photo_id })
        setSelections(saved)
        if (myVotes.length >= 3) {
          setSessionComplete(true)
        } else {
          setCurrentRoundIdx(myVotes.length)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [visitorId])

  useEffect(() => {
    const channel = supabase
      .channel('votes-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        (payload) => {
          const { round_id, photo_id } = payload.new
          setVoteCounts(prev => {
            const updated = { ...prev }
            if (!updated[round_id]) updated[round_id] = { a: 0, b: 0, c: 0, d: 0 }
            updated[round_id] = {
              ...updated[round_id],
              [photo_id]: (updated[round_id][photo_id] || 0) + 1
            }
            return updated
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (isProcessing) {
      const t1 = setTimeout(() => setProcessingStep(1), 1000)
      const t2 = setTimeout(() => {
        setIsProcessing(false)
        setRevealed(true)
      }, 2200)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [isProcessing])

  const currentRound = ROUNDS_DATA[currentRoundIdx]

  const displayPhotos = useMemo(() => {
    if (!visitorId || !currentRound) return []
    return seededShuffle(currentRound.photos, visitorId + currentRound.id).map((p, i) => ({
      ...p,
      displayLetter: ['A', 'B', 'C', 'D'][i]
    }))
  }, [visitorId, currentRound])

  const roundVotes = voteCounts[currentRound?.id] || { a: 0, b: 0, c: 0, d: 0 }
  const crowdFavoriteId = useMemo(() => getCrowdFavorite(roundVotes), [roundVotes])
  const tiedLeaders = useMemo(() => getTiedLeaders(roundVotes), [roundVotes])
  const isTied = crowdFavoriteId === null && tiedLeaders.length > 1
  const totalVotes = useMemo(() => getTotalVotes(roundVotes), [roundVotes])

  const reportCardData = useMemo(() => {
    if (!revealed || !currentRound) return null
    const userPickId = selections[currentRound.id]
    if (!userPickId) return null
    const aiPickId = currentRound.ai_pick
    const userPct = getPercentage(userPickId, roundVotes)
    const aiPickLetter = displayPhotos.find(p => p.id === aiPickId)?.displayLetter || '?'

    if (isTied) {
      const tiedLeaderLetters = tiedLeaders.map(id => displayPhotos.find(p => p.id === id)?.displayLetter || '?').sort()
      const tiedPct = getPercentage(tiedLeaders[0], roundVotes)
      return getReportCard({
        userPick: userPickId, aiPick: aiPickId, crowdFav: null, tiedLeaders,
        userPct, crowdFavPct: null, crowdFavLetter: null, aiPickLetter,
        tiedLeaderLetters, tiedPct,
        userAmongLeaders: isAmongLeaders(userPickId, roundVotes),
        aiAmongLeaders: isAmongLeaders(aiPickId, roundVotes)
      })
    }

    const cFavPct = getPercentage(crowdFavoriteId, roundVotes)
    const crowdFavLetter = displayPhotos.find(p => p.id === crowdFavoriteId)?.displayLetter || '?'
    return getReportCard({
      userPick: userPickId, aiPick: aiPickId, crowdFav: crowdFavoriteId, tiedLeaders,
      userPct, crowdFavPct: cFavPct, crowdFavLetter, aiPickLetter,
      tiedLeaderLetters: [], tiedPct: 0,
      userAmongLeaders: false, aiAmongLeaders: false
    })
  }, [revealed, currentRound, selections, roundVotes, crowdFavoriteId, tiedLeaders, isTied, displayPhotos])

  const handleConfirm = useCallback(async () => {
    if (!selectedId || revealed || isProcessing || !visitorId) return
    setSelections(prev => ({ ...prev, [currentRound.id]: selectedId }))
    setIsProcessing(true)
    setProcessingStep(0)
    setVoteError(false)
    try {
      const position = displayPhotos.findIndex(p => p.id === selectedId)
      const sessionNum = parseInt(localStorage.getItem('htl_session_number') || '1', 10)
      const snapshot = voteCounts[currentRound.id] || { a: 0, b: 0, c: 0, d: 0 }
      const shuffleOrder = displayPhotos.map(p => p.id)
      const decisionTimeMs = Date.now() - roundStartTime.current
      const { error } = await supabase.from('votes').insert({
        visitor_id: visitorId,
        device_id: deviceId,
        round_id: currentRound.id,
        photo_id: selectedId,
        display_position: position,
        session_number: sessionNum,
        crowd_snapshot: snapshot,
        shuffle_order: shuffleOrder,
        decision_time_ms: decisionTimeMs,
        device_type: visitorMeta.device_type || null,
        user_agent: visitorMeta.user_agent || null,
        timezone: visitorMeta.timezone || null,
        country: visitorMeta.country || null,
        region: visitorMeta.region || null,
        referrer: visitorMeta.referrer || null
      })
      if (error) {
        console.error('Vote error:', error.code, error.message)
        if (error.code !== '23505') {
          setVoteError(true)
        }
      }
    } catch (err) {
      console.error('Vote error:', err)
      setVoteError(true)
    }
  }, [selectedId, revealed, isProcessing, visitorId, deviceId, currentRound, displayPhotos, voteCounts, visitorMeta])

  const stats = useMemo(() => {
    let crowdMatches = 0
    let aiMatches = 0
    let aiAccuracy = 0
    ROUNDS_DATA.forEach(round => {
      const userPick = selections[round.id]
      const rVotes = voteCounts[round.id] || {}
      const cFav = getCrowdFavorite(rVotes)
      const aiP = round.ai_pick
      if (userPick && cFav && userPick === cFav) crowdMatches++
      if (userPick && userPick === aiP) aiMatches++
      if (isAmongLeaders(aiP, rVotes)) aiAccuracy++
    })
    return { crowdMatches, aiMatches, aiAccuracy }
  }, [selections, voteCounts])

  const typeKey = useMemo(() => getTasteType(stats.crowdMatches, stats.aiMatches), [stats])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <LogoSection size="w-16 h-16" />
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-black rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-black rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    )
  }

  if (sessionComplete) {
    return (
      <SummaryView
        stats={stats}
        selections={selections}
        voteCounts={voteCounts}
        typeKey={typeKey}
        visitorId={visitorId}
        onReset={() => {
          const newId = crypto.randomUUID()
          localStorage.setItem('htl_visitor_id', newId)
          const currentSession = parseInt(localStorage.getItem('htl_session_number') || '1', 10)
          localStorage.setItem('htl_session_number', String(currentSession + 1))
          setVisitorId(newId)
          setSelections({})
          setSelectedId(null)
          setRevealed(false)
          setSessionComplete(false)
          setCurrentRoundIdx(0)
          roundStartTime.current = Date.now()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans overflow-x-hidden selection:bg-black selection:text-white">
      <header className="max-w-7xl mx-auto px-6 md:px-8 pt-8 md:pt-12 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <LogoSection size="w-12 h-12 md:w-16 md:h-16" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-0.5">
                Round {currentRoundIdx + 1} of {ROUNDS_DATA.length}
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
                HUMAN TASTE LAB
              </h1>
            </div>
          </div>
          <p className="text-gray-500 text-sm md:text-[15px] leading-relaxed max-w-xl font-medium">
            Which photo is the best? Pick your favorite. See what{' '}
            <br className="hidden md:block" />
            everyone else picked. See if AI predicted the winner.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white border border-gray-200 rounded-lg px-5 py-2.5 flex items-center gap-3 shadow-sm shrink-0">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-[13px] font-bold tracking-tight lowercase">{totalVotes} votes</span>
          </div>
          <div className="bg-[#F0FFF4] text-[#00A854] border border-[#DCFCE7] rounded-lg px-5 py-2.5 flex items-center gap-2.5 shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#00A854] animate-pulse" />
            <span className="text-[13px] font-black uppercase tracking-tight">Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-8 pb-32">
        <div className="grid grid-cols-4 gap-2 md:gap-6 mb-8 mt-12 md:mt-24">
          {displayPhotos.map((photo) => {
            const isTapped = selectedId === photo.id
            const isConfirmed = selections[currentRound.id] === photo.id
            const isAiPick = currentRound.ai_pick === photo.id
            const isWinner = !isTied && crowdFavoriteId === photo.id
            const pct = getPercentage(photo.id, roundVotes)

            return (
              <div key={photo.id} className="relative flex flex-col group transition-all duration-500">
                <button
                  disabled={revealed || isProcessing}
                  onClick={() => setSelectedId(photo.id)}
                  className={`relative w-full aspect-[4/5] rounded-[12px] md:rounded-[24px] overflow-hidden transition-all duration-300
                    ${revealed ? 'cursor-default' : 'md:hover:-translate-y-1 md:hover:shadow-lg active:scale-95 shadow-sm'}
                    ${isTapped && !revealed ? 'ring-4 ring-black ring-offset-2' : ''}
                    ${isWinner && revealed ? 'ring-4 ring-[#FFD600] ring-offset-2' : ''}
                  `}
                >
                  <img
                    src={photo.src}
                    className={`w-full h-full object-cover transition-all duration-700
                      ${revealed ? 'brightness-[0.45] grayscale-[0.2]' : ''}
                      ${revealed && !isWinner && !isTied ? 'opacity-60 saturate-[0.4]' : ''}
                    `}
                    alt=""
                  />
                  {revealed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
                      <div className="absolute top-1 right-1 md:top-4 md:right-4 flex flex-col gap-1 items-end">
                        {isWinner && (
                          <span className="bg-[#FFD600] text-black text-[6px] md:text-[10px] font-black px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-md uppercase tracking-wider">
                            MOST POPULAR
                          </span>
                        )}
                        {isAiPick && (
                          <span className="bg-[#2B7FFF] text-white text-[6px] md:text-[10px] font-black px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-md uppercase tracking-wider shadow-lg">
                            AI PICK
                          </span>
                        )}
                      </div>
                      <span className="text-[20px] md:text-[64px] font-black leading-none">
                        {pct}%
                      </span>
                      {isConfirmed && (
                        <div className="absolute bottom-4 md:bottom-12 bg-white text-black px-3 md:px-6 py-1 md:py-2.5 rounded-full flex items-center gap-1.5 md:gap-2 text-[6px] md:text-[11px] font-black uppercase tracking-wider shadow-xl z-10 border border-black/5">
                          <Check className="w-3 h-3 md:w-4 md:h-4 stroke-[3px]" /> YOUR PICK
                        </div>
                      )}
                    </div>
                  )}
                </button>
                <div className="mt-4 md:mt-6 flex justify-between items-center px-1">
                  <span className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.1em] transition-colors
                    ${isTapped && !revealed ? 'text-black' : 'text-gray-400'}
                  `}>
                    PHOTO {photo.displayLetter}
                  </span>
                  {revealed && (
                    <span className="text-[10px] md:text-[12px] font-black text-gray-900">
                      {pct}%
                    </span>
                  )}
                </div>
                <div className="mt-2 h-[4px] md:h-[6px] bg-gray-100 rounded-full overflow-hidden mx-1">
                  <div
                    className={`h-full transition-all duration-1000 ease-out ${isWinner ? 'bg-[#FFD600]' : 'bg-gray-300'}`}
                    style={{ width: revealed ? `${pct}%` : '0%' }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 md:mt-20 max-w-4xl mx-auto flex flex-col items-center min-h-[160px]">
          {!revealed && !isProcessing ? (
            <div className="w-full flex flex-col items-center gap-6">
              {selectedId ? (
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={handleConfirm}
                    className="bg-black text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:scale-105 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                  >
                    Lock in Photo {displayPhotos.find(p => p.id === selectedId)?.displayLetter}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                    <Info className="w-7 h-7 text-gray-200" />
                  </div>
                  <p className="text-[11px] md:text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] leading-loose max-w-sm text-center">
                    Select a photo above to reveal{' '}
                    <br className="hidden md:block" />
                    the crowd favorite and AI&apos;s pick.
                  </p>
                </div>
              )}
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center gap-6 animate-pulse py-10">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-black rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-3 h-3 bg-black rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-3 h-3 bg-black rounded-full animate-bounce" />
              </div>
              <p className="text-[14px] font-bold uppercase tracking-[0.2em] text-gray-500">
                {processingStep === 0 ? "Counting votes..." : "Checking AI's prediction..."}
              </p>
            </div>
          ) : (
            <div className="w-full">
              {voteError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-center">
                  <p className="text-red-600 text-sm font-medium">Your vote may not have saved. Check your connection and try refreshing.</p>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-[32px] p-8 md:p-14 text-left shadow-sm mb-12 relative overflow-hidden">
                <div className="w-full space-y-10">
                  <div className="space-y-6">
                    <p className="text-[20px] md:text-[24px] font-medium leading-tight text-gray-900 border-l-4 border-black pl-6">
                      {reportCardData?.personalLine}
                    </p>
                    <p className="text-lg md:text-[18px] text-gray-500">
                      {reportCardData?.aiConnectionLine}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-lg md:text-[18px] text-black font-bold">
                        {reportCardData?.verdictLine}
                      </div>
                      <span className={`px-4 py-1.5 rounded-lg text-[11px] font-black text-white uppercase tracking-wider shadow-sm
                        ${reportCardData?.aiCorrect ? 'bg-green-500' : 'bg-[#FF3B30]'}
                      `}>
                        {reportCardData?.isTied
                          ? (reportCardData?.aiCorrect ? 'In the mix' : 'Wrong')
                          : (reportCardData?.aiCorrect ? 'Correct' : 'Wrong')
                        }
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                      <p className="text-lg md:text-[18px] text-gray-600 font-serif italic leading-relaxed">
                        &ldquo;{currentRound.ai_reasoning}&rdquo;
                      </p>
                      <p className="text-[11px] font-bold text-gray-400 mt-4 uppercase tracking-widest">
                        &mdash; {currentRound.ai_model}
                      </p>
                    </div>
                  </div>
                  <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${reportCardData?.aiCorrect ? 'bg-green-500' : 'bg-[#FF3B30]'}`} />
                      <span className="text-[15px] font-serif italic text-gray-400">
                        {reportCardData?.closingLine}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (currentRoundIdx < ROUNDS_DATA.length - 1) {
                          setCurrentRoundIdx(c => c + 1)
                          setRevealed(false)
                          setSelectedId(null)
                          roundStartTime.current = Date.now()
                        } else {
                          setSessionComplete(true)
                        }
                      }}
                      className="w-full md:w-auto bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                    >
                      {currentRoundIdx === ROUNDS_DATA.length - 1 ? 'SEE YOUR RESULTS \u2192' : 'NEXT ROUND'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ————————————————————————————————————————————————————————
// SUMMARY / RESULTS VIEW
// ————————————————————————————————————————————————————————

function SummaryView({ stats, selections, voteCounts, typeKey, visitorId, onReset }) {
  const [copied, setCopied] = useState(false)

  const profile = useMemo(() => {
    if (typeKey === 'machine-eye') return getMachineEyeContent(stats.crowdMatches)
    if (typeKey === 'digital-eye') return getDigitalEyeContent(stats.crowdMatches)
    if (typeKey === 'human-element') return getHumanElementContent(stats.crowdMatches)
    return TASTE_CONTENT[typeKey] || TASTE_CONTENT['outlier']
  }, [typeKey, stats.crowdMatches])

  const aiScorecardData = useMemo(() => getAiScorecard(stats.aiAccuracy), [stats.aiAccuracy])

  const handleShare = () => {
    const text = `I got "${profile.typeName}" on Human Taste Lab. ${stats.crowdMatches}/3 crowd matches. AI got ${stats.aiAccuracy}/3. What's your taste type? humantastelab.com`
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getRoundStory = (round) => {
    const userPickId = selections[round.id]
    const votes = voteCounts[round.id] || { a: 0, b: 0, c: 0, d: 0 }
    const crowdFavId = getCrowdFavorite(votes)
    const leaders = getTiedLeaders(votes)
    const roundIsTied = crowdFavId === null && leaders.length > 1

    const shuffled = seededShuffle(round.photos, visitorId + round.id).map((p, i) => ({
      ...p,
      displayLetter: ['A', 'B', 'C', 'D'][i]
    }))
    const uLetter = shuffled.find(p => p.id === userPickId)?.displayLetter || '?'
    const aLetter = shuffled.find(p => p.id === round.ai_pick)?.displayLetter || '?'

    if (roundIsTied) {
      const leaderLetters = leaders.map(id => shuffled.find(p => p.id === id)?.displayLetter || '?').sort()
      const tiedStr = formatPhotoList(leaderLetters)
      const tiedPct = getPercentage(leaders[0], votes)
      const userInMix = isAmongLeaders(userPickId, votes)
      const aiInMix = isAmongLeaders(round.ai_pick, votes)

      if (userInMix && aiInMix) return `${tiedStr} tied at ${tiedPct}%. You and AI both picked tied leaders.`
      if (userInMix && !aiInMix) return `${tiedStr} tied at ${tiedPct}%. Your pick was a tied leader. AI picked Photo ${aLetter} instead.`
      if (!userInMix && aiInMix) return `${tiedStr} tied at ${tiedPct}%. You picked Photo ${uLetter}. AI picked a tied leader.`
      return `${tiedStr} tied at ${tiedPct}%. You picked Photo ${uLetter}. AI picked Photo ${aLetter}. Nobody picked a leader.`
    }

    const cLetter = shuffled.find(p => p.id === crowdFavId)?.displayLetter || '?'
    const crowdPct = getPercentage(crowdFavId, votes)
    const matchedCrowd = userPickId === crowdFavId
    const aiCorrect = round.ai_pick === crowdFavId
    const matchedAi = userPickId === round.ai_pick

    if (matchedCrowd && aiCorrect) return `You picked Photo ${uLetter}, the crowd favorite. AI called it too.`
    if (matchedCrowd && !aiCorrect) return `You picked Photo ${uLetter}, the crowd favorite. AI picked Photo ${aLetter} instead.`
    if (!matchedCrowd && matchedAi) return `You picked Photo ${uLetter}, same as AI. The crowd went with Photo ${cLetter} (${crowdPct}%).`
    if (!matchedCrowd && !matchedAi && aiCorrect) return `You picked Photo ${uLetter}. The crowd went with Photo ${cLetter} (${crowdPct}%). AI saw it coming.`
    return `You picked Photo ${uLetter}. The crowd went with Photo ${cLetter} (${crowdPct}%). AI picked Photo ${aLetter}. Nobody agreed.`
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans pb-32">
      <header className="max-w-3xl mx-auto px-6 pt-12 flex justify-between items-center mb-16">
        <div className="flex items-center gap-3">
          <LogoSection size="w-10 h-10" />
          <h1 className="text-xl font-black uppercase tracking-tight">HUMAN TASTE LAB</h1>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">3 ROUNDS COMPLETE</span>
      </header>

      <section className={`max-w-4xl mx-auto mx-6 rounded-[40px] p-12 md:p-20 bg-gradient-to-br ${profile.bg} text-white relative overflow-hidden shadow-2xl`}>
        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: profile.accent }} />
        <div className="relative z-10 space-y-6">
          <h2 className="text-6xl md:text-8xl font-serif italic tracking-tighter leading-none">
            {profile.typeName}
          </h2>
          <h3 className="text-xl md:text-2xl font-serif italic opacity-90" style={{ color: profile.accent }}>
            {profile.headline}
          </h3>
          <p className="text-lg md:text-xl leading-relaxed opacity-55 max-w-2xl font-medium">
            {profile.description}
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 -mt-12 px-6 relative z-20">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-xl space-y-2">
          <div className="text-5xl font-serif" style={{ color: '#C9A84C' }}>
            {stats.crowdMatches}<span className="text-2xl text-gray-500">/3</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 leading-tight">
            YOU MATCHED THE CROWD
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-xl space-y-2">
          <div className="text-5xl font-serif" style={{ color: '#7C6BDB' }}>
            {stats.aiAccuracy}<span className="text-2xl text-gray-500">/3</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 leading-tight">
            AI PREDICTED THE WINNER
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-xl space-y-2">
          <div className="text-5xl font-serif text-[#1C1C28]">
            {stats.aiMatches}<span className="text-2xl text-gray-500">/3</span>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 leading-tight">
            YOU AND AI AGREED
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 mt-16">
        <div className="bg-white border border-gray-100 rounded-3xl p-10 md:p-12 shadow-sm">
          <p className="text-lg md:text-xl text-gray-500 leading-relaxed font-medium">
            {profile.detail}
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 mt-8">
        <div className="rounded-2xl p-8 flex items-center gap-6 border border-black/5 shadow-sm" style={{ backgroundColor: aiScorecardData.bg }}>
          <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: aiScorecardData.dot }} />
          <p className="text-lg md:text-xl font-serif italic text-gray-700 leading-relaxed">
            {aiScorecardData.text}
          </p>
        </div>
      </section>

      {/* Round by Round */}
      <section className="max-w-3xl mx-auto px-6 mt-24">
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100">
          <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-400">
            ROUND BY ROUND
          </h3>
          <div className="flex flex-col md:flex-row gap-2 md:gap-8 items-end md:items-center">
            <div className="flex items-center gap-2 text-[7px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="w-3 h-3 rounded-full bg-[#C9A84C] shrink-0" /> YOU PICKED THE CROWD FAVORITE
            </div>
            <div className="flex items-center gap-2 text-[7px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="w-3 h-3 rounded-full bg-[#7C6BDB] shrink-0" /> AI PICKED THE CROWD FAVORITE
            </div>
            <div className="flex items-center gap-2 text-[7px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="w-3 h-3 rounded-full bg-[#1C1C28] shrink-0" /> YOU AND AI PICKED THE SAME
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {ROUNDS_DATA.map((round, idx) => {
            const votes = voteCounts[round.id] || { a: 0, b: 0, c: 0, d: 0 }
            const crowdFavId = getCrowdFavorite(votes)
            const userPickId = selections[round.id]
            const matchedCrowd = crowdFavId && userPickId && userPickId === crowdFavId
            const aiWasRight = isAmongLeaders(round.ai_pick, votes)
            const userAndAiAgreed = userPickId && userPickId === round.ai_pick

            return (
              <div key={round.id} className="py-10 flex items-start gap-8 border-b border-gray-50 last:border-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold shadow-sm
                  ${matchedCrowd ? 'bg-black text-white' : 'border-2 border-gray-100 text-gray-300'}
                `}>
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
                    ROUND {idx + 1}
                  </p>
                  <p className="text-lg md:text-xl font-medium text-gray-800 leading-snug italic">
                    {getRoundStory(round)}
                  </p>
                </div>
                <div className="flex gap-4 pt-1">
                  <div className={`w-5 h-5 rounded-full shadow-sm ${matchedCrowd ? 'bg-[#C9A84C]' : 'bg-gray-100'}`} title="You matched crowd" />
                  <div className={`w-5 h-5 rounded-full shadow-sm ${aiWasRight ? 'bg-[#7C6BDB]' : 'bg-gray-100'}`} title="AI predicted winner" />
                  <div className={`w-5 h-5 rounded-full shadow-sm ${userAndAiAgreed ? 'bg-[#1C1C28]' : 'bg-gray-100'}`} title="You and AI agreed" />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 mt-32">
        <div className="bg-[#1C1C28] rounded-[40px] p-12 md:p-16 text-center text-white space-y-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-500 rounded-full blur-[100px]" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-yellow-500 rounded-full blur-[100px]" />
          </div>
          <div className="space-y-4 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30">MY TASTE TYPE</p>
            <h4 className="text-4xl md:text-6xl font-serif italic leading-none">{profile.typeName}</h4>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[11px] md:text-[13px] font-black uppercase tracking-widest opacity-60 relative z-10">
            <span>{stats.crowdMatches}/3 CROWD</span>
            <span className="w-1 h-1 bg-white/20 rounded-full self-center" />
            <span>{stats.aiMatches}/3 AI MATCH</span>
            <span className="w-1 h-1 bg-white/20 rounded-full self-center" />
            <span>AI GOT {stats.aiAccuracy}/3</span>
          </div>
          <div className="space-y-8 pt-4 relative z-10">
            <p className="text-[11px] font-black tracking-[0.4em] opacity-30">HUMANTASTELAB.COM</p>
            <button
              onClick={handleShare}
              className="bg-white text-black px-12 py-5 rounded-full text-[12px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto shadow-xl"
            >
              <Share2 className="w-4 h-4" />
              {copied ? "COPIED TO CLIPBOARD" : "SHARE RESULT"}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 mt-16 text-center">
        <button
          onClick={onReset}
          className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 hover:text-black transition-colors flex items-center justify-center gap-3 mx-auto py-8"
        >
          <RotateCcw className="w-4 h-4" /> RESTART EXPERIMENT
        </button>
      </div>
    </div>
  )
}
