import { StyleSheet } from "@react-pdf/renderer";

export const globalStyles = StyleSheet.create({
  page: {
    fontSize: 12,
    paddingHorizontal: '1.5cm',
    paddingTop: '1cm',
    paddingBottom: '0cm',
    fontFamily: 'Liberation Serif',
  },
  body: {
    fontFamily: 'Liberation Serif',
    fontSize: 12,
    textAlign: 'justify',
  },
  link: {
    color: '#000000',
    textDecoration: 'underline',
  },
  section: {
    flexDirection: 'row',
  },
  sectionColumn: {
    flexGrow: 1,
  },
  header: {
    marginBottom: '0.7cm',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: '2cm',
  },
  footerSection: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  pageCount: {
    fontFamily: 'Liberation Serif',
    fontSize: 12,
    position: 'absolute',
    bottom: '1cm',
    right: '1.5cm',
  }
});