import { StyleSheet } from "@react-pdf/renderer";

export const globalStyles = StyleSheet.create({
  page: {
    fontSize: 12,
    paddingHorizontal: '1.5cm',
    paddingTop: '1cm',
    paddingBottom: '0cm',
    fontFamily: 'Liberation Serif',
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
});