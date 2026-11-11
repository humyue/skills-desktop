import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export default function MarkdownView({ markdown }) {
  const html = useMemo(() => {
    const raw = marked.parse(markdown || '', { async: false })
    return DOMPurify.sanitize(raw)
  }, [markdown])

  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
}
