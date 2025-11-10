import TetrisBoard from "../components/TetrisBoard";

export default function Home() {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-slate-900 text-pink-400">
      <h1 className="text-5xl font-bold">🎮 Tailwind 4 fonctionne !</h1>
      <p className="mt-4 text-lg">Bienvenue sur ton futur Tetris</p>
      <TetrisBoard />
    </div>
  );
}