const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Membership = require('../models/membership');
const Workspace = require('../models/workspace');

async function signup(req, res) {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 8);

    await User.create({ email, password: hashedPassword });

    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.sendStatus(401);

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.sendStatus(401);

    const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
    const token = jwt.sign({ sub: user._id, exp }, process.env.JWT_SECRET);

    res.cookie('Authorization', token, {
      expires: new Date(exp),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
}

function logout(req, res) {
  try {
    res.clearCookie('Authorization', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
}

function checkAuth(req, res) {
  try {
    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
}

async function me(req, res) {
  const memberships = await Membership.find({ userId: req.user._id });

  const workspaceIds = memberships.map((membership) => membership.workspaceId);

  const workspaces = await Workspace.find({
    _id: { $in: workspaceIds },
  });

  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      isSystemAdmin: req.user.isSystemAdmin,
    },
    memberships,
    workspaces,
  });
}

module.exports = {
  signup,
  login,
  logout,
  checkAuth,
  me,
};
