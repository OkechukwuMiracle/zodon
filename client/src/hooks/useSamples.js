import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

let cache = null;

/** Synthetic sample cases served by the backend (cached for the session). */
export function useSamples() {
  const [state, setState] = useState(() => (cache ? { samples: cache, error: null, loading: false } : { samples: [], error: null, loading: true }));
  useEffect(() => {
    if (cache) return undefined;
    let alive = true;
    api
      .samples()
      .then((res) => {
        cache = res.samples;
        if (alive) setState({ samples: res.samples, error: null, loading: false });
      })
      .catch((error) => alive && setState({ samples: [], error, loading: false }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
