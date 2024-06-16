

export const fontFamily = "'Montserrat', sans-serif";

const paragraph = {
  fontFamily,
  margin: '0 0 14px',
  fontSize: '14px',
  lineHeight: '1.4',
  color: '#000',
  whiteSpace: 'pre-line',
};

export const styles = {
  logo: {
    width: 260,
    height: 64,
  },
  main: {
    backgroundColor: '#ffffff',
  },
  container: {
    margin: '0 auto',
    padding: '20px 0 48px',
    width: '580px',
  },
  heading: {
    fontFamily,
    fontSize: '18px',
    letterSpacing: '-0.5px',
    lineHeight: '24px',
    fontWeight: '700',
    color: '#000',
    padding: '16px 0 0',
  },
  paragraph,
  quoteParagraph: {
    ...paragraph,
    borderLeft: '3px solid #e0e0e0',
    paddingLeft: '8px',
  },
  buttonContainer: {
  },
  button: {
    fontFamily,
    backgroundColor: '#1757a6',
    borderRadius: '4px',
    fontWeight: '600',
    color: '#fff',
    fontSize: '14px',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'block',
    padding: "12px 24px",
  },
  muted: {
    fontFamily,
    fontSize: '13px',
    color: '#616161',
  },
  hr: {
    borderColor: '#dfe1e4',
    margin: '16px 0 16px',
  },
  link: {
    color: '#1757a6',
    fontWeight: '600',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  code: {
    fontFamily: 'monospace',
    fontWeight: '700',
    padding: '1px 4px',
    backgroundColor: '#dfe1e4',
    letterSpacing: '-0.3px',
    fontSize: '21px',
    borderRadius: '4px',
    color: '#3c4149',
  },
} as const satisfies Record<string, React.CSSProperties>;
