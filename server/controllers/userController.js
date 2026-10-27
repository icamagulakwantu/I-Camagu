// backend/controllers/userController.js
import prisma from '../config/db.js';
import { syncUserClanGroups } from '../services/izidukoService.js';
import { setPin, hasPinSet, verifyPin, pinFailureResponse } from '../services/pinService.js';
import { matchClan } from '../services/clanMatchService.js';

// Live availability check as someone types a username, so "already taken"
// shows before they submit rather than after. Same rule the real submit
// endpoint enforces (setUsername below) — this just checks it earlier.
export async function checkUsernameAvailable(req, res) {
  const username = (req.query.username || '').trim();
  if (username.length < 3) {
    return res.json({ available: false, reason: 'Must be at least 3 characters' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== req.userId) {
      return res.json({ available: false, reason: 'Already taken' });
    }
    res.json({ available: true });
  } catch (error) {
    console.error('Check username error:', error.message);
    res.status(500).json({ error: 'Could not check username' });
  }
}

export async function setUsername(req, res) {
  const { username } = req.body;
  const userId = req.userId;

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: 'That username is already taken' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: username.trim() },
    });

    res.json({ username: user.username });
  } catch (error) {
    console.error('Set username error:', error.message);
    res.status(500).json({ error: 'Could not set username' });
  }
}

export async function updateIziduko(req, res) {
  const { paternalIziduko, maternalIziduko, paternalGrandmotherIziduko, maternalGrandmotherIziduko, nationLabel } = req.body;
  if (!paternalIziduko || !maternalIziduko) {
    return res.status(400).json({ error: 'Both paternal and maternal Iziduko are required' });
  }

  try {
    const paternalMatch = await matchClan(paternalIziduko);
    const clanGroupId = paternalMatch.autoSelect ? paternalMatch.results[0]?.id || null : null;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { paternalIziduko, maternalIziduko, paternalGrandmotherIziduko, maternalGrandmotherIziduko, nationLabel, clanGroupId },
    });

    await syncUserClanGroups(user);
    res.json({ paternalIziduko: user.paternalIziduko, maternalIziduko: user.maternalIziduko, paternalGrandmotherIziduko: user.paternalGrandmotherIziduko, maternalGrandmotherIziduko: user.maternalGrandmotherIziduko, nationLabel: user.nationLabel, clanGroupId: user.clanGroupId });
  } catch (error) {
    console.error('Update Iziduko error:', error.message);
    res.status(500).json({ error: 'Could not update Iziduko' });
  }
}

export async function updateProfile(req, res) {
  const { address, age, phoneNumber, location, profileImage, latitude, longitude } = req.body;
  try {
    if (profileImage && profileImage.length > 2_000_000) {
      return res.status(400).json({ error: 'Image too large — please choose a smaller photo (under ~1.5MB)' });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        address: address !== undefined ? address : undefined,
        age: age ? parseInt(age, 10) : undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
        location: location !== undefined ? location : undefined,
        profileImage: profileImage !== undefined ? profileImage : undefined,
        latitude: latitude !== undefined ? latitude : undefined,
        longitude: longitude !== undefined ? longitude : undefined,
      },
    });

    res.json({
      address: user.address,
      age: user.age,
      phoneNumber: user.phoneNumber,
      location: user.location,
      profileImage: user.profileImage,
      latitude: user.latitude,
      longitude: user.longitude,
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Could not update profile' });
  }
}

export async function setUserPin(req, res) {
  const { pin, oldPin } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { pinHash: true },
    });
    if (!user) return res.status(404).json({ error: 'Account not found' });

    // Setting a first PIN only requires an authenticated account. Replacing an
    // existing PIN requires proof of the current PIN to limit damage from a
    // stolen access token.
    if (user.pinHash) {
      if (typeof oldPin !== 'string' || !/^\d{4,6}$/.test(oldPin)) {
        return res.status(400).json({ error: 'Enter your current PIN to change it' });
      }
      const check = await verifyPin(req.userId, oldPin);
      if (!check.valid) {
        const failure = pinFailureResponse(check);
        return res.status(failure.status).json({ error: failure.error });
      }
    }

    await setPin(req.userId, pin);
    res.json({ message: 'PIN set successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function checkPinStatus(req, res) {
  try {
    const has = await hasPinSet(req.userId);
    res.json({ hasPinSet: has });
  } catch (error) {
    res.status(500).json({ error: 'Could not check PIN status' });
  }
}
