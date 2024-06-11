import express from 'express';
import { testEmail } from '../alerts/mailer';
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

export default router;