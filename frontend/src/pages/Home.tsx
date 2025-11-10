import TetrisBoard from "../components/TetrisBoard";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 text-pink-400">
      {/* conteneur centré dans la page */}
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center gap-6 py-10">
        <h1 className="text-5xl font-bold drop-shadow-lg text-center">Tetris</h1>
        <TetrisBoard />
      </div>
    </main>
  );
}
