// backend/controllers/userController.js
import prisma from '../config/db.js';
import { syncUserClanGroups } from '../services/izidukoService.js';
import { setPin, hasPinSet } from '../services/pinService.js';

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
  const { paternalIziduko, maternalIziduko, paternalGrandmotherIziduko, maternalGrandmotherIziduko } = req.body;
  if (!paternalIziduko || !maternalIziduko) {
    return res.status(400).json({ error: 'Both paternal and maternal Iziduko are required' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { paternalIziduko, maternalIziduko, paternalGrandmotherIziduko, maternalGrandmotherIziduko },
    });

    await syncUserClanGroups(user);
    res.json({ paternalIziduko: user.paternalIziduko, maternalIziduko: user.maternalIziduko, paternalGrandmotherIziduko: user.paternalGrandmotherIziduko, maternalGrandmotherIziduko: user.maternalGrandmotherIziduko });
  } catch (error) {
    console.error('Update Iziduko error:', error.message);
    res.status(500).json({ error: 'Could not update Iziduko' });
  }
}

export async function updateProfile(req, res) {
  const { address, age, phoneNumber, location, profileImage } = req.body;
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
      },
    });

    res.json({
      address: user.address,
      age: user.age,
      phoneNumber: user.phoneNumber,
      location: user.location,
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Could not update profile' });
  }
}

export async function setUserPin(req, res) {
  const { pin } = req.body;
  try {
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
