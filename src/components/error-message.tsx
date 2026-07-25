type ErrorMessageProps = {
  children: string;
  id?: string;
};

export function ErrorMessage({ children, id }: ErrorMessageProps) {
  return (
    <p
      id={id}
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {children}
    </p>
  );
}
