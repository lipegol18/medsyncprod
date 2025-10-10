interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function BadgeNative({ children, className = "" }: BadgeProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
