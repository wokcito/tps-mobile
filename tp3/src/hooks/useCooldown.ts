import { useCallback, useEffect, useState } from 'react';
import { COOLDOWN_SECONDS } from '../lib/authErrors';
import { cooldownRemaining, startCooldown } from '../lib/cooldown';

/** Cuenta regresiva visual para una clave de cooldown; sobrevive a cambios de pantalla. */
export function useCooldown(key: string) {
  const [remaining, setRemaining] = useState(() => cooldownRemaining(key));

  useEffect(() => {
    setRemaining(cooldownRemaining(key));
    const id = setInterval(() => setRemaining(cooldownRemaining(key)), 1000);
    return () => clearInterval(id);
  }, [key]);

  const start = useCallback(
    (seconds = COOLDOWN_SECONDS) => {
      startCooldown(key, seconds);
      setRemaining(cooldownRemaining(key));
    },
    [key],
  );

  return { remaining, active: remaining > 0, start };
}
