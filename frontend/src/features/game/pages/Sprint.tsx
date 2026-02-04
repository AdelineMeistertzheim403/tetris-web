import TetrisBoardSprint from "../components/board/TetrisBoardSprint";

export default function Sprint() {
  // Page minimale: tout le gameplay Sprint est encapsulé dans le board dédié.
  return (
    <div className="flex justify-center items-center h-screen bg-black">
      <TetrisBoardSprint />
    </div>
  );
}
