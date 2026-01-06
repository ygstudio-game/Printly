import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get upload URL
router.post('/upload-url', authMiddleware , async (req: Request, res: Response) => {
  try {
    const { fileName, shopId } = req.body;

    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${nanoid()}.${fileExtension}`;
    const fileKey = `uploads/${shopId}/${uniqueFileName}`;

    const { data, error } = await supabase.storage
      .from('print-jobs')
      .createSignedUploadUrl(fileKey);

    if (error) {
      return res.status(500).json({ error: 'Failed to create upload URL' });
    }

    res.json({
      uploadUrl: data.signedUrl,
      fileKey,
      fileName
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete file
router.post('/delete',authMiddleware, async (req: Request, res: Response) => {
  try {
    const { fileKey } = req.body;

    const { error } = await supabase.storage
      .from('print-jobs')
      .remove([fileKey]);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete file' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
