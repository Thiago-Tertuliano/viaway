import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type MenuCtx = {
  open: () => void;
  close: () => void;
  visible: boolean;
};

const Ctx = createContext<MenuCtx | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const v = useMemo(
    () => ({ open, close, visible }),
    [open, close, visible],
  );
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useMenu() {
  const c = useContext(Ctx);
  if (!c) {
    return {
      open: () => {},
      close: () => {},
      visible: false,
    } satisfies MenuCtx;
  }
  return c;
}
