// src/services/workflowEvents.ts
import { RawEvent } from '../models/workflow.model';

export function createWorkflowEventSource(
  baseUrl: string,
  onEvent: (event: RawEvent) => void,
  onError: (message: string) => void,
  onDone: () => void
): EventSource {
  const url = `${baseUrl}/api/make`;
  const es = new EventSource(url);

  es.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data) as RawEvent;
      onEvent(data);

      if (data.step === 'error') {
        onError(data.message || 'Ismeretlen hiba.');
        es.close();
      } else if (data.step === 'done') {
        onDone();
        es.close();
      }
    } catch (err) {
      console.error('SSE adat hiba:', err);
      onError('Érvénytelen SSE adat érkezett.');
      es.close();
    }
  };

  es.onerror = () => {
    console.error('SSE kapcsolat hiba');
    onError('SSE hiba a kapcsolatban.');
    es.close();
  };

  return es;
}
