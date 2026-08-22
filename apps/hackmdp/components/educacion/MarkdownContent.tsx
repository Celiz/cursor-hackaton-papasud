"use client"

import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function MarkdownContent({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold tracking-tight text-foreground mt-10 mb-3">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold text-foreground mt-8 mb-2">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-[15px] leading-[1.8] text-foreground/85 mb-4">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/75">{children}</em>
        ),
        hr: () => (
          <hr className="my-10 border-border/40" />
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-foreground/20 pl-4 my-4 text-foreground/70 italic">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-6 my-4 space-y-1 text-[15px] leading-[1.8] text-foreground/85">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 my-4 space-y-1 text-[15px] leading-[1.8] text-foreground/85">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-[15px] leading-[1.8]">{children}</li>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.startsWith("language-")
          if (isBlock) {
            return (
              <code className="block bg-muted/50 border border-border/40 rounded-lg p-4 my-4 text-sm font-mono overflow-x-auto">
                {children}
              </code>
            )
          }
          return (
            <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          )
        },
      }}
    >
      {content}
    </Markdown>
  )
}
