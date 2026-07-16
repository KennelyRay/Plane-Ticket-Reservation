import { useState, type ComponentProps } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

/**
 * Password field with a show/hide toggle. Drop-in for a plain
 * `<input type="password">` — spreads react-hook-form's register() props
 * (ref included) straight onto the underlying input.
 */
export default function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className ?? ''} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink-soft transition-colors"
      >
        {visible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
      </button>
    </div>
  );
}
