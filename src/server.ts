import express from 'express';
import chatRouter from '../supabase/functions/chat';
import path from 'path';

const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use('/api', chatRouter);
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(port, () => {
  console.log(`Black Mage Forest running at http://localhost:${port}`);
});

