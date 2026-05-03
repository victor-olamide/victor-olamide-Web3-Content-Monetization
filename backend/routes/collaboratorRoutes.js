const express = require('express');
const router = express.Router();
const { verifyCreatorOwnership } = require('../middleware/creatorAuth');
const Content = require('../models/Content');
const {
  getCollaborators,
  addCollaborator,
  updateCollaboratorRoyalty,
  removeCollaborator,
  getContentRoyaltySummary
} = require('../services/royaltyService');

// Get all collaborators for a content
router.get('/:contentId', async (req, res) => {
  try {
    const collaborators = await getCollaborators(parseInt(req.params.contentId));
    res.json({ contentId: req.params.contentId, collaborators });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch collaborators', error: err.message });
  }
});

// Add a collaborator to content (creator only)
router.post('/:contentId', verifyCreatorOwnership, async (req, res) => {
  try {
    const { address, royaltyPercentage, name, role } = req.body;

    if (!address || typeof royaltyPercentage !== 'number') {
      return res.status(400).json({ 
        message: 'Missing required fields: address, royaltyPercentage' 
      });
    }

    const collaborator = await addCollaborator(
      parseInt(req.params.contentId),
      address,
      royaltyPercentage,
      name,
      role
    );

    res.status(201).json({
      message: 'Collaborator added successfully',
      collaborator
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to add collaborator', error: err.message });
  }
});

// Update collaborator royalty (creator only)
router.patch('/:contentId/:collaboratorId', verifyCreatorOwnership, async (req, res) => {
  try {
    const { royaltyPercentage } = req.body;

    if (typeof royaltyPercentage !== 'number') {
      return res.status(400).json({ message: 'Missing required field: royaltyPercentage' });
    }

    const updated = await updateCollaboratorRoyalty(req.params.collaboratorId, royaltyPercentage);

    res.json({
      message: 'Collaborator royalty updated successfully',
      collaborator: updated
    });
  } catch (err) {
    res.status(400).json({ message: 'Failed to update collaborator', error: err.message });
  }
});

// Remove a collaborator from content (creator only)
router.delete('/:contentId/:collaboratorId', verifyCreatorOwnership, async (req, res) => {
  try {
    await removeCollaborator(req.params.collaboratorId);

    res.json({ message: 'Collaborator removed successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to remove collaborator', error: err.message });
  }
});

// Get royalty summary for content
router.get('/:contentId/summary', async (req, res) => {
  try {
    const summary = await getContentRoyaltySummary(parseInt(req.params.contentId));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch royalty summary', error: err.message });
  }
});

module.exports = router;
