/** Round-trip handoff: the flights page stashes the return leg here when the
 *  user picks their outbound flight; the booking confirmation offers it back. */
export const RETURN_LEG_KEY = 'vf-return-leg';

export interface ReturnLeg {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
  outboundFlightId: string;
}

export const readReturnLeg = (): ReturnLeg | null => {
  try {
    const raw = sessionStorage.getItem(RETURN_LEG_KEY);
    return raw ? (JSON.parse(raw) as ReturnLeg) : null;
  } catch {
    return null;
  }
};

export const clearReturnLeg = () => sessionStorage.removeItem(RETURN_LEG_KEY);
