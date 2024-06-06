import React from 'react';
import express from 'express';
import { testEmail } from '../alerts/mailer';
import ReactPDF, { Font } from '@react-pdf/renderer';
import { SignUpForm } from '../documents/templates/sign-up-form';
import { LiquidationForm } from '../documents/templates/liquidation-form';
import { StatutoryDeclaration } from '../documents/templates/statutory_declaration';
const router = express.Router();

router.get('/email', async (req, res) => {
  const { t } = req.query;
  try {
    const html = await testEmail(t as string);
    res.status(200).send(html);
  } catch(err) {
    console.log(err)
    res.status(400).send("Error.");
  }
});

Font.register({
  family: 'Liberation Serif',
  fonts: [
    { src: "/Users/haginus/Desktop/projects/bachelor-backend/src/documents/fonts/LiberationSerif-Regular.ttf" },
    { src: "/Users/haginus/Desktop/projects/bachelor-backend/src/documents/fonts/LiberationSerif-Bold.ttf", fontWeight: 'bold' },
    { src: "/Users/haginus/Desktop/projects/bachelor-backend/src/documents/fonts/LiberationSerif-Italic.ttf", fontStyle: 'italic' },
  ],
});

export default router;