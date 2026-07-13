const express = require('express');
const { admin, db } = require('../../config/firebase');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const ref = db.collection('_backend_health').doc('firebase');
    await ref.set(
      { lastCheckedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    const snap = await ref.get();

    res.json({
      ok: true,
      firebase: {
        projectId: admin.app().options.projectId,
        firestore: {
          wrote: true,
          docExists: snap.exists,
          data: snap.data() || null,
        },
      },
    });
  } catch (err) {
    err.status = 500;
    err.message = `Firebase connectivity test failed: ${err.message}`;
    next(err);
  }
});

module.exports = router;

