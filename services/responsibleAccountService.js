const Responsible = require('../models/responsible');
const { appError } = require('../utils/functions');

async function adjustResponsibleAccountBalance({ workspaceId, responsibleId, amount, session }) {
  const responsible = await Responsible.findOneAndUpdate(
    {
      workspaceId,
      _id: responsibleId,
    },
    {
      $inc: {
        accountBalance: amount,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    },
  );

  if (!responsible) {
    throw appError('Responsavel nao encontrado', 404);
  }

  return {
    responsible,
    previousAccountBalance: responsible.accountBalance - amount,
  };
}

module.exports = { adjustResponsibleAccountBalance };
