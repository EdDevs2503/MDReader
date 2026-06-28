import Pane from './Pane';
import { useStore } from '../lib/store';

export default function PaneGrid() {
  const panes = useStore((s) => s.panes);

  return (
    <div className="pane-grid">
      {panes.map((pane) => (
        <Pane key={pane.id} pane={pane} />
      ))}
    </div>
  );
}
