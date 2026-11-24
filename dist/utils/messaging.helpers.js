"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGE_REF_TYPES = exports.PARTICIPANT_TYPES = exports.populateMessageFields = exports.getOtherParticipant = exports.buildParticipantQuery = exports.toMessageRefType = exports.normalizeParticipantType = void 0;
const PARTICIPANT_TYPES = ['USER', 'CHARITY'];
exports.PARTICIPANT_TYPES = PARTICIPANT_TYPES;
const MESSAGE_REF_TYPES = ['User', 'Charity'];
exports.MESSAGE_REF_TYPES = MESSAGE_REF_TYPES;
const normalizeParticipantType = (type) => {
    if (!type)
        return null;
    const upper = String(type).toUpperCase();
    if (upper === 'USER')
        return 'USER';
    if (upper === 'CHARITY')
        return 'CHARITY';
    return null;
};
exports.normalizeParticipantType = normalizeParticipantType;
const toMessageRefType = (participantType) => {
    const normalized = (0, exports.normalizeParticipantType)(participantType);
    if (normalized === 'USER')
        return 'User';
    if (normalized === 'CHARITY')
        return 'Charity';
    return null;
};
exports.toMessageRefType = toMessageRefType;
const buildParticipantQuery = (participantId, participantType) => ({
    participantId,
    participantType: (0, exports.normalizeParticipantType)(participantType),
});
exports.buildParticipantQuery = buildParticipantQuery;
const getOtherParticipant = (conversation, currentUserId) => {
    var _a;
    return (_a = conversation.participants) === null || _a === void 0 ? void 0 : _a.find((p) => p.participantId.toString() !== currentUserId.toString());
};
exports.getOtherParticipant = getOtherParticipant;
const populateMessageFields = (message, Message, User, Charity) => __awaiter(void 0, void 0, void 0, function* () {
    const populated = message.toObject ? message.toObject() : Object.assign({}, message);
    if (populated.senderType === 'User') {
        populated.sender = yield User.findById(populated.sender).select('firstName lastName userName profileImage email');
    }
    else {
        populated.sender = yield Charity.findById(populated.sender).select('charityName userName profileImage email');
    }
    if (populated.recipientType === 'User') {
        populated.recipient = yield User.findById(populated.recipient).select('firstName lastName userName profileImage email');
    }
    else {
        populated.recipient = yield Charity.findById(populated.recipient).select('charityName userName profileImage email');
    }
    return populated;
});
exports.populateMessageFields = populateMessageFields;
