declare module 'remove-markdown' {
  interface Options {
    /** Strip list leaders (e.g. `*`, `-`, `+`, `1.`) */
    stripListLeaders?: boolean;
    /** Unicode character to use for list leaders */
    listUnicodeChar?: string;
    /** Enable GitHub Flavored Markdown */
    gfm?: boolean;
    /** Use image alt text */
    useImgAltText?: boolean;
  }
  
  function removeMarkdown(markdown: string, options?: Options): string;
  export default removeMarkdown;
}
