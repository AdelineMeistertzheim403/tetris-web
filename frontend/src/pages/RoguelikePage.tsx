import { useState } from 'react'
import '../styles/roguelike.css'
import RoguelikeIntro from '../components/RogueLikeIntro'
import RoguelikeRun from '../components/RoguelikeRun'

export default function RoguelikePage() {
  const [started, setStarted] = useState(false)

  return (
    <div className="roguelike-mode">
      {!started ? (
        <RoguelikeIntro onStart={() => setStarted(true)} />
      ) : (
        <RoguelikeRun />
      )}
    </div>
  )
}
