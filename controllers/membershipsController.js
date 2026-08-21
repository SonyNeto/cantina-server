const Membership = require('../models/membership');

const fetchMemberships = async (req, res) => {
  const { workspaceId } = req.params;
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const search = req.query.search;

  const filter = { workspaceId };

  if (search) {
    filter.name = {
      // add name to membership?
      $regex: search,
      $options: 'i',
    };
  }

  let membershipsQuery = Membership.find(filter).sort({ role: 1 }).populate('userId', 'email');

  let pagination = null;

  if (page && limit) {
    membershipsQuery = membershipsQuery.skip((page - 1) * limit).limit(limit);

    const numberOfMenuItems = await Membership.countDocuments(filter);

    const totalPages = Math.ceil(numberOfMenuItems / limit);
    const nextPage = page < totalPages ? page + 1 : null;

    pagination = {
      page,
      totalPages,
      nextPage,
    };
  }

  const memberships = await membershipsQuery;

  const membershipsWithEmail = memberships.map((membership) => ({
    ...membership.toObject(),
    email: membership.userId.email,
    userId: membership.userId._id,
  }));

  res.json({ memberships: membershipsWithEmail, pagination });
};

module.exports = {
  fetchMemberships,
};
