"use client";

interface FormattedHtmlProps {
  html: string;
  className?: string;
}

export default function FormattedHtml({ html, className = "" }: FormattedHtmlProps) {
  if (!html) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
