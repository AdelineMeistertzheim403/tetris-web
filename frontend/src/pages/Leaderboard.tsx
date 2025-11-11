import { useEffect, useState } from "react";
import { getLeaderboard } from "../services/scoreService";

export default function Leaderboard() {
  const [scores, setScores] = useState<any[]>([]);

  useEffect(() => {
    getLeaderboard().then(setScores).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col items-center text-center mt-20 text-pink-400">
      <h1 className="text-3xl text-yellow-400 mb-6">🏆 Classement</h1>
      <table className="border border-pink-500 rounded-lg w-[60%] bg-black bg-opacity-50 bg-gradient-to-b from-[#0b001a] to-[#1a0033]">
        <thead>
          <tr className="text-yellow-400">
            <th className="py-2">#</th>
            <th>Joueur</th>
            <th>Score</th>
            <th>Niveau</th>
            <th>Lignes</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr key={s.id} className="hover:bg-pink-900 transition">
              <td className="py-2">{i + 1}</td>
              <td>{s.user.pseudo}</td>
              <td>{s.value}</td>
              <td>{s.level}</td>
              <td>{s.lines}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
