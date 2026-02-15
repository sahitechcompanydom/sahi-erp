"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type WikiArticleContentProps = {
  content: string;
  mediaUrls?: string[];
  className?: string;
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.includes("video");
}

export function WikiArticleContent({ content, mediaUrls = [], className }: WikiArticleContentProps) {
  return (
    <div className={cn("wiki-content space-y-4", className)}>
      <div className="wiki-markdown text-sm max-w-none [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_a]:text-primary [&_a]:underline">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: ({ node, className: codeClass, children, ...props }) => (
              <code className={cn("rounded bg-muted px-1.5 py-0.5 text-sm", codeClass)} {...props}>
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-sm">
                {children}
              </pre>
            ),
            img: ({ src, alt }) => (
              <span className="block my-2">
                <img
                  src={src ?? ""}
                  alt={alt ?? ""}
                  className="max-w-full h-auto rounded-md border object-contain"
                />
              </span>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {mediaUrls.length > 0 && (
        <div className="mt-6 space-y-4 border-t pt-6">
          <h4 className="text-sm font-medium text-foreground">Attachments</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {mediaUrls.map((url) =>
              isVideoUrl(url) ? (
                <div key={url} className="rounded-lg border bg-muted/30 overflow-hidden">
                  <video
                    src={url}
                    controls
                    className="w-full max-w-full"
                    style={{ maxWidth: "100%" }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div key={url} className="rounded-lg border overflow-hidden">
                  <img
                    src={url}
                    alt="Wiki attachment"
                    className="w-full h-auto object-contain max-h-64"
                  />
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
