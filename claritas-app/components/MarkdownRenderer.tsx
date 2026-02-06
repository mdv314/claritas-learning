"use client";

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    return (
        <span className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
            >
                {content.replace(/\\n/g, '\n')}
            </ReactMarkdown>
        </span>
    );
}
