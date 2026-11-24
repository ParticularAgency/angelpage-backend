const PARTICIPANT_TYPES = ['USER', 'CHARITY'];
const MESSAGE_REF_TYPES = ['User', 'Charity'];

export const normalizeParticipantType = (type) => {
  if (!type) return null;
  const upper = String(type).toUpperCase();
  if (upper === 'USER') return 'USER';
  if (upper === 'CHARITY') return 'CHARITY';
  return null;
};

export const toMessageRefType = (participantType) => {
  const normalized = normalizeParticipantType(participantType);
  if (normalized === 'USER') return 'User';
  if (normalized === 'CHARITY') return 'Charity';
  return null;
};

export const buildParticipantQuery = (participantId, participantType) => ({
  participantId,
  participantType: normalizeParticipantType(participantType),
});

export const getOtherParticipant = (conversation, currentUserId) =>
  conversation.participants?.find(
    (p) => p.participantId.toString() !== currentUserId.toString()
  );

export const populateMessageFields = async (message, Message, User, Charity) => {
  const populated = message.toObject ? message.toObject() : { ...message };

  if (populated.senderType === 'User') {
    populated.sender = await User.findById(populated.sender).select(
      'firstName lastName userName profileImage email'
    );
  } else {
    populated.sender = await Charity.findById(populated.sender).select(
      'charityName userName profileImage email'
    );
  }

  if (populated.recipientType === 'User') {
    populated.recipient = await User.findById(populated.recipient).select(
      'firstName lastName userName profileImage email'
    );
  } else {
    populated.recipient = await Charity.findById(populated.recipient).select(
      'charityName userName profileImage email'
    );
  }

  return populated;
};

export { PARTICIPANT_TYPES, MESSAGE_REF_TYPES };
