"use client";

interface FormattedHtmlProps {
  html: string;
  className?: string;
}

export default function FormattedHtml({ html, className = "" }: FormattedHtmlProps) {
  if (!html) return null;

  const style = {
    fontSize: '1.125rem',
    lineHeight: '1.75rem',
    color: '#52525b',
  };

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
