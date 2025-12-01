import React from 'react';
import { cn } from '../../lib/utils'; // We'll need to create this utility or just use clsx/tailwind-merge directly if preferred, but standard is lib/utils

// Let's create the utils file first or inline it. For now, I'll inline the merge logic if utils doesn't exist, 
// but better to stick to the plan. I'll assume I can create utils next or now.
// Actually, I'll create the utils file in a separate step or just use clsx/tailwind-merge here directly to be safe.


interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'neon';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20',
      secondary: 'bg-slate-800 text-white hover:bg-slate-700',
      outline: 'border-2 border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white',
      ghost: 'text-slate-400 hover:text-white hover:bg-slate-800/50',
      neon: 'bg-transparent border border-[#00f3ff] text-[#00f3ff] shadow-[0_0_10px_#00f3ff] hover:bg-[#00f3ff]/10 hover:shadow-[0_0_20px_#00f3ff] transition-all duration-300',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
