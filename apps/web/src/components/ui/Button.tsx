import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';

const buttonStyles = {
  base: 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed',
  variant: {
    primary:
      'bg-accent hover:bg-accent-dark text-white shadow-lg hover:shadow-accent/25',
    secondary: 'glass glass-hover text-text-primary',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-card',
  },
  size: {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-sm px-5 py-2.5',
    lg: 'text-base px-8 py-3.5',
  },
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonStyles.variant;
  size?: keyof typeof buttonStyles.size;
  to?: LinkProps['to'];
}

function buttonClassName(
  variant: keyof typeof buttonStyles.variant,
  size: keyof typeof buttonStyles.size,
  className?: string,
) {
  return cn(
    buttonStyles.base,
    buttonStyles.variant[variant],
    buttonStyles.size[size],
    className,
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, to, ...props }, ref) => {
    const classes = buttonClassName(variant, size, className);

    if (to) {
      const { onClick, type: _type, ...linkProps } = props;
      return (
        <Link to={to} className={classes} onClick={onClick} {...linkProps}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
