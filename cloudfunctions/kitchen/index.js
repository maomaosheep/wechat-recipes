const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const MAX_TEAM_MEMBERS = 3;
const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_RETRY_LIMIT = 8;

const adminOpenids = [
  'o6zAJs3jcRoW3LJC_jOmmWaOwHNA'
];

const requiredCollections = [
  'users',
  'teams',
  'teamInviteCodes',
  'teamMembers',
  'recipes',
  'favorites',
  'banners'
];

let ensureCollectionsPromise = null;

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (err) {
    const message = String((err && (err.message || err.errMsg || err.code || err.errCode)) || '');
    const isAlreadyExists = message.indexOf('already exists') >= 0
      || message.indexOf('collection exists') >= 0
      || message.indexOf('DATABASE_COLLECTION_ALREADY_EXIST') >= 0
      || message.indexOf('ResourceExist') >= 0
      || message.indexOf('Table exist') >= 0
      || message.indexOf('-502005') >= 0
      || message.indexOf('-501001') >= 0;
    if (!isAlreadyExists) {
      throw err;
    }
  }
}

async function ensureCollections() {
  if (!ensureCollectionsPromise) {
    ensureCollectionsPromise = Promise.all(requiredCollections.map(ensureCollection));
  }
  return ensureCollectionsPromise;
}

function normalizeDoc(doc) {
  return {
    ...doc,
    id: doc.id || doc._id,
    title: doc.title || doc.name,
    name: doc.name || doc.title,
    cover: doc.cover || doc.image,
    image: doc.image || doc.cover,
    creatorNickName: doc.creatorNickName || doc.nickName || ''
  };
}

function appError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function isDuplicateError(err) {
  const message = String((err && (err.message || err.errMsg || err.code || err.errCode)) || '');
  return message.indexOf('duplicate') >= 0
    || message.indexOf('DUPLICATE') >= 0
    || message.indexOf('already exists') >= 0
    || message.indexOf('-501007') >= 0;
}

function randomInviteCode() {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

async function reserveInviteCode(openid, teamId = '') {
  for (let i = 0; i < INVITE_CODE_RETRY_LIMIT; i += 1) {
    const code = randomInviteCode();
    try {
      await db.collection('teamInviteCodes').add({
        data: {
          _id: code,
          inviteCode: code,
          teamId,
          ownerOpenid: openid,
          status: teamId ? 'active' : 'reserved',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      });
      return code;
    } catch (err) {
      if (!isDuplicateError(err) || i === INVITE_CODE_RETRY_LIMIT - 1) {
        throw appError('INVITE_CODE_GENERATE_FAILED', 'Failed to reserve unique invite code');
      }
    }
  }
  throw appError('INVITE_CODE_GENERATE_FAILED', 'Failed to reserve unique invite code');
}

async function bindInviteCode(code, teamId) {
  if (!code || !teamId) return null;
  return db.collection('teamInviteCodes').doc(code).update({
    data: {
      teamId,
      status: 'active',
      updatedAt: Date.now()
    }
  });
}

async function releaseInviteCode(code) {
  if (!code) return null;
  try {
    return await db.collection('teamInviteCodes').doc(code).remove();
  } catch (err) {
    return null;
  }
}

async function getTeamByInviteCode(code) {
  try {
    const invite = await db.collection('teamInviteCodes').doc(code).get();
    if (invite.data && invite.data.teamId && invite.data.status !== 'deleted') {
      const team = await getTeam(invite.data.teamId);
      return team ? { team, invite } : { team: null, invite };
    }
    if (invite.data) return { team: null, invite };
  } catch (err) {
    // Old teams created before teamInviteCodes existed are resolved by the legacy lookup below.
  }

  const teamRes = await db.collection('teams').where({ inviteCode: code }).limit(1).get();
  if (!teamRes.data.length) return { team: null, invite: null };
  return { team: teamRes.data[0], invite: null };
}

async function getUser(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get();
  if (res.data.length) return res.data[0];
  const now = Date.now();
  const addRes = await db.collection('users').add({
    data: {
      openid,
      nickName: '',
      avatarUrl: '',
      teamId: '',
      createdAt: now,
      updatedAt: now
    }
  });
  return { _id: addRes._id, openid, nickName: '', avatarUrl: '', teamId: '' };
}

async function updateProfile(openid, profile = {}) {
  const user = await getUser(openid);
  const nickName = profile.nickName || profile.nickname || user.nickName || '';
  const avatarUrl = profile.avatarUrl || user.avatarUrl || '';
  await db.collection('users').doc(user._id).update({
    data: {
      nickName,
      avatarUrl,
      updatedAt: Date.now()
    }
  });
  return { ...user, nickName, avatarUrl };
}

async function getTeam(teamId) {
  if (!teamId) return null;
  try {
    const res = await db.collection('teams').doc(teamId).get();
    return res.data || null;
  } catch (err) {
    return null;
  }
}

async function getTeamMembers(teamId) {
  if (!teamId) return [];
  const res = await db.collection('teamMembers').where({ teamId }).limit(MAX_TEAM_MEMBERS).get();
  const openids = res.data.map((item) => item.openid);
  if (!openids.length) return [];
  const users = await db.collection('users').where({ openid: _.in(openids) }).get();
  return res.data.map((member) => {
    const user = users.data.find((item) => item.openid === member.openid) || {};
    return {
      openid: member.openid,
      role: member.role,
      nickName: user.nickName || member.nickName || '',
      avatarUrl: user.avatarUrl || ''
    };
  });
}

async function requireTeam(openid) {
  const user = await getUser(openid);
  if (!user.teamId) {
    const err = new Error('NO_TEAM');
    err.code = 'NO_TEAM';
    throw err;
  }
  return user;
}

function recipeScope(teamId) {
  if (!teamId) {
    return _.or([
      { teamId: _.exists(false) },
      { teamId: '' }
    ]);
  }
  return _.or([
    { teamId },
    { teamId: _.exists(false) },
    { teamId: '' }
  ]);
}

async function listRecipes(openid, params = {}) {
  const user = await getUser(openid);
  const category = params.category || 'all';
  const page = Number(params.page || 1);
  const pageSize = Number(params.pageSize || 6);
  const scope = recipeScope(user.teamId);
  const baseWhere = category === 'all' ? scope : _.and([scope, { category }]);

  const res = await db.collection('recipes')
    .where(baseWhere)
    .orderBy('recommended', 'desc')
    .orderBy('updatedAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    rows: res.data.map(normalizeDoc),
    hasMore: res.data.length === pageSize,
    total: -1
  };
}

async function listAllRecipes(openid) {
  const user = await getUser(openid);
  const res = await db.collection('recipes')
    .where(recipeScope(user.teamId))
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();
  return res.data.map(normalizeDoc);
}

async function getRecipeById(openid, id) {
  const user = await getUser(openid);
  let recipe = null;
  try {
    const res = await db.collection('recipes').doc(id).get();
    recipe = res.data;
  } catch (err) {
    const res = await db.collection('recipes').where({ id }).limit(1).get();
    recipe = res.data[0] || null;
  }
  if (!recipe) return null;
  if (recipe.teamId && recipe.teamId !== user.teamId && !adminOpenids.includes(openid)) return null;
  return normalizeDoc(recipe);
}

async function saveRecipe(openid, recipe) {
  const user = await requireTeam(openid);
  const payload = {
    ...recipe,
    title: recipe.title || recipe.name,
    name: recipe.name || recipe.title,
    cover: recipe.cover || recipe.image,
    image: recipe.image || recipe.cover,
    teamId: user.teamId,
    creatorOpenid: openid,
    creatorNickName: user.nickName || '',
    updatedAt: Date.now()
  };
  const docId = payload._id;
  const bizId = payload.id;
  delete payload._id;

  if (docId) {
    const current = await getRecipeById(openid, docId);
    if (!current || (current.creatorOpenid !== openid && !adminOpenids.includes(openid))) throw new Error('NO_PERMISSION');
    await db.collection('recipes').doc(docId).update({ data: payload });
    return { ...payload, id: bizId || docId, _id: docId };
  }

  if (bizId) {
    const existed = await db.collection('recipes').where({ id: bizId }).limit(1).get();
    if (existed.data.length) {
      const current = existed.data[0];
      if (current.teamId && current.teamId !== user.teamId) throw new Error('NO_PERMISSION');
      if (current.creatorOpenid && current.creatorOpenid !== openid && !adminOpenids.includes(openid)) throw new Error('NO_PERMISSION');
      await db.collection('recipes').doc(current._id).update({ data: payload });
      return { ...payload, id: bizId, _id: current._id };
    }
  }

  const res = await db.collection('recipes').add({
    data: {
      ...payload,
      createdAt: Date.now()
    }
  });
  return { ...payload, id: bizId || res._id, _id: res._id };
}

async function deleteRecipe(openid, id) {
  const user = await requireTeam(openid);
  let current = null;
  let docId = id;
  try {
    const res = await db.collection('recipes').doc(id).get();
    current = res.data;
  } catch (err) {
    const res = await db.collection('recipes').where({ id }).limit(1).get();
    current = res.data[0] || null;
    docId = current && current._id;
  }
  if (!current) return null;
  if (current.teamId !== user.teamId && !adminOpenids.includes(openid)) throw new Error('NO_PERMISSION');
  if (current.creatorOpenid && current.creatorOpenid !== openid && !adminOpenids.includes(openid)) throw new Error('NO_PERMISSION');
  return db.collection('recipes').doc(docId).remove();
}

async function createTeam(openid, params = {}) {
  const user = await updateProfile(openid, params.profile);
  const existedMembership = await db.collection('teamMembers').where({ openid }).limit(1).get();
  if (existedMembership.data.length) {
    const currentTeamId = existedMembership.data[0].teamId;
    const currentTeam = await getTeam(currentTeamId);
    if (currentTeam) {
      if (user.teamId !== currentTeamId) {
        await db.collection('users').doc(user._id).update({
          data: {
            teamId: currentTeamId,
            updatedAt: Date.now()
          }
        });
      }
      throw appError('USER_ALREADY_IN_TEAM', 'User already belongs to a team');
    }
    await db.collection('teamMembers').doc(existedMembership.data[0]._id).remove();
  }
  if (user.teamId) {
    const team = await getTeam(user.teamId);
    if (team) throw appError('USER_ALREADY_IN_TEAM', 'User already belongs to a team');
    await db.collection('users').doc(user._id).update({
      data: {
        teamId: '',
        updatedAt: Date.now()
      }
    });
  }
  const now = Date.now();

  let res = null;
  let code = '';
  for (let i = 0; i < INVITE_CODE_RETRY_LIMIT; i += 1) {
    code = await reserveInviteCode(openid);
    try {
      res = await db.collection('teams').add({
        data: {
          name: params.name || 'Kitchen Team',
          ownerOpenid: openid,
          inviteCode: code,
          status: 'active',
          maxMembers: MAX_TEAM_MEMBERS,
          memberCount: 1,
          createdAt: now,
          updatedAt: now
        }
      });
      await bindInviteCode(code, res._id);
      break;
    } catch (err) {
      if (res && res._id) {
        try {
          await db.collection('teams').doc(res._id).remove();
        } catch (rollbackTeamErr) {
          console.error('rollback team after invite bind failed', rollbackTeamErr);
        }
      }
      res = null;
      await releaseInviteCode(code);
      if (!isDuplicateError(err) || i === INVITE_CODE_RETRY_LIMIT - 1) {
        throw appError('TEAM_CREATE_FAILED', String((err && (err.message || err.errMsg)) || err || 'Failed to create team'));
      }
    }
  }
  if (!res || !res._id) throw appError('TEAM_CREATE_FAILED', 'Failed to create team');

  try {
    await db.collection('teamMembers').add({
      data: {
        teamId: res._id,
        openid,
        role: 'owner',
        nickName: user.nickName || '',
        joinedByInviteCode: '',
        joinSource: 'createTeam',
        createdAt: now,
        updatedAt: now
      }
    });
    await db.collection('users').doc(user._id).update({
      data: {
        teamId: res._id,
        updatedAt: now
      }
    });
  } catch (err) {
    try {
      await db.collection('teamMembers').where({ teamId: res._id, openid }).remove();
      await db.collection('teams').doc(res._id).remove();
      await releaseInviteCode(code);
    } catch (rollbackErr) {
      console.error('rollback createTeam failed', rollbackErr);
    }
    if (isDuplicateError(err)) {
      throw appError('USER_ALREADY_IN_TEAM', 'Duplicate team membership');
    }
    throw appError('TEAM_CREATE_WRITE_FAILED', String((err && (err.message || err.errMsg)) || err || 'Failed to write team owner'));
  }
  return getMyTeam(openid);
}

async function joinTeam(openid, params = {}) {
  const user = await updateProfile(openid, params.profile);
  const code = String(params.inviteCode || '').trim().toUpperCase();
  if (!code) throw appError('INVITE_CODE_REQUIRED', 'Invite code is required');
  const { team, invite } = await getTeamByInviteCode(code);
  if (!team && invite) throw appError('TEAM_NOT_FOUND', 'Team does not exist');
  if (!team) throw appError('INVITE_CODE_NOT_FOUND', 'Invite code does not exist');
  if (!team || !team._id || team.status === 'deleted') {
    throw appError('TEAM_NOT_FOUND', 'Team does not exist');
  }

  const currentMembership = await db.collection('teamMembers').where({ openid }).limit(1).get();
  if (currentMembership.data.length) {
    const currentTeamId = currentMembership.data[0].teamId;
    const currentTeam = await getTeam(currentTeamId);
    if (currentTeam) {
      if (currentTeamId === team._id) {
        throw appError('USER_ALREADY_IN_THIS_TEAM', 'User already belongs to this team');
      }
      throw appError('USER_ALREADY_IN_OTHER_TEAM', 'User already belongs to another team');
    }
    await db.collection('teamMembers').doc(currentMembership.data[0]._id).remove();
  }

  if (user.teamId) {
    const currentTeam = await getTeam(user.teamId);
    if (currentTeam) {
      if (user.teamId === team._id) {
        throw appError('USER_ALREADY_IN_THIS_TEAM', 'User already belongs to this team');
      }
      throw appError('USER_ALREADY_IN_OTHER_TEAM', 'User already belongs to another team');
    }
  }

  const members = await db.collection('teamMembers').where({ teamId: team._id }).limit(MAX_TEAM_MEMBERS + 1).get();
  if (members.data.length >= (team.maxMembers || MAX_TEAM_MEMBERS)) throw appError('TEAM_FULL', 'Team is full');
  const now = Date.now();
  const maxMembers = team.maxMembers || MAX_TEAM_MEMBERS;

  try {
    await db.collection('teamMembers').add({
      data: {
        teamId: team._id,
        openid,
        role: 'member',
        nickName: user.nickName || '',
        joinedByInviteCode: code,
        joinSource: params.source || 'inviteCode',
        createdAt: now,
        updatedAt: now
      }
    });
    await db.collection('users').doc(user._id).update({
      data: {
        teamId: team._id,
        updatedAt: now
      }
    });
    const afterMembers = await db.collection('teamMembers').where({ teamId: team._id }).limit(maxMembers + 1).get();
    if (afterMembers.data.length > maxMembers) {
      throw appError('TEAM_FULL', 'Team is full');
    }
    await db.collection('teams').doc(team._id).update({
      data: {
        memberCount: afterMembers.data.length,
        updatedAt: now
      }
    });
  } catch (err) {
    const message = String((err && (err.message || err.errMsg || err.code || err.errCode)) || '');
    try {
      await db.collection('teamMembers').where({ teamId: team._id, openid }).remove();
      if (user._id) {
        await db.collection('users').doc(user._id).update({
          data: {
            teamId: user.teamId || '',
            updatedAt: Date.now()
          }
        });
      }
    } catch (rollbackErr) {
      console.error('rollback joinTeam failed', rollbackErr);
    }
    if (isDuplicateError(err)) {
      throw appError('USER_ALREADY_IN_TEAM', 'Duplicate team membership');
    }
    if (err && err.code === 'TEAM_FULL') {
      throw err;
    }
    throw appError('TEAM_JOIN_WRITE_FAILED', message || 'Failed to write team membership');
  }
  return getMyTeam(openid);
}

async function generateInviteCode(openid) {
  const user = await requireTeam(openid);
  const team = await getTeam(user.teamId);
  if (!team) throw appError('TEAM_NOT_FOUND', 'Team does not exist');
  if (team.ownerOpenid !== openid && !adminOpenids.includes(openid)) {
    throw appError('NO_PERMISSION', 'Only team owner can regenerate invite code');
  }

  for (let i = 0; i < INVITE_CODE_RETRY_LIMIT; i += 1) {
    const oldCode = team.inviteCode || '';
    const code = await reserveInviteCode(openid, user.teamId);
    try {
      await db.collection('teams').doc(user.teamId).update({
        data: {
          inviteCode: code,
          updatedAt: Date.now()
        }
      });
      if (oldCode && oldCode !== code) {
        await releaseInviteCode(oldCode);
      }
      return getMyTeam(openid);
    } catch (err) {
      await releaseInviteCode(code);
      if (!isDuplicateError(err) || i === INVITE_CODE_RETRY_LIMIT - 1) {
        throw appError('INVITE_CODE_GENERATE_FAILED', String((err && (err.message || err.errMsg)) || err || 'Failed to update invite code'));
      }
    }
  }

  throw appError('INVITE_CODE_GENERATE_FAILED', 'Failed to update invite code');
}

async function getMyTeam(openid) {
  const user = await getUser(openid);
  let teamId = user.teamId || '';
  if (!teamId) {
    const membership = await db.collection('teamMembers').where({ openid }).limit(1).get();
    if (membership.data.length) {
      teamId = membership.data[0].teamId || '';
      if (teamId && user._id) {
        await db.collection('users').doc(user._id).update({
          data: {
            teamId,
            updatedAt: Date.now()
          }
        });
      }
    }
  }

  const team = await getTeam(teamId);
  if (teamId && !team && user._id) {
    await db.collection('users').doc(user._id).update({
      data: {
        teamId: '',
        updatedAt: Date.now()
      }
    });
  }
  const members = team ? await getTeamMembers(teamId) : [];
  return {
    user: {
      openid,
      nickName: user.nickName || '',
      avatarUrl: user.avatarUrl || '',
      teamId: team ? teamId : ''
    },
    team: team ? {
      id: team._id,
      name: team.name,
      inviteCode: team.inviteCode,
      ownerOpenid: team.ownerOpenid,
      memberCount: members.length
    } : null,
    members
  };
}

async function listFavorites(openid) {
  const user = await getUser(openid);
  if (!user.teamId) return [];
  const res = await db.collection('favorites').where({ teamId: user.teamId }).orderBy('createdAt', 'desc').limit(100).get();
  return res.data;
}

async function saveFavorite(openid, params = {}) {
  const user = await requireTeam(openid);
  const recipe = await getRecipeById(openid, params.recipeId);
  if (!recipe) throw new Error('RECIPE_NOT_FOUND_OR_FORBIDDEN');
  const now = Date.now();
  const existed = await db.collection('favorites').where({ teamId: user.teamId, recipeId: params.recipeId }).limit(1).get();
  const payload = {
    teamId: user.teamId,
    recipeId: params.recipeId,
    creatorOpenid: openid,
    creatorNickName: user.nickName || '',
    updatedAt: now
  };
  if (existed.data.length) {
    await db.collection('favorites').doc(existed.data[0]._id).update({ data: payload });
    return { ...payload, _id: existed.data[0]._id };
  }
  const res = await db.collection('favorites').add({ data: { ...payload, createdAt: now } });
  return { ...payload, _id: res._id };
}

async function deleteFavorite(openid, params = {}) {
  const user = await requireTeam(openid);
  const recipeId = params.recipeId;
  if (!recipeId) throw new Error('RECIPE_ID_REQUIRED');
  const existed = await db.collection('favorites')
    .where({ teamId: user.teamId, recipeId })
    .limit(1)
    .get();
  if (!existed.data.length) return null;
  return db.collection('favorites').doc(existed.data[0]._id).remove();
}

exports.main = async (event = {}) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const action = event.action;
    if (!openid) throw appError('INVALID_LOGIN', 'Invalid login');
    await ensureCollections();

    switch (action) {
      case 'updateProfile':
        return updateProfile(openid, event.profile);
      case 'getMyTeam':
        return getMyTeam(openid);
      case 'createTeam':
        return createTeam(openid, event);
      case 'joinTeam':
        return joinTeam(openid, event);
      case 'generateInviteCode':
        return generateInviteCode(openid);
      case 'listRecipes':
        return listRecipes(openid, event);
      case 'listAllRecipes':
        return listAllRecipes(openid);
      case 'getRecipeById':
        return getRecipeById(openid, event.id);
      case 'saveRecipe':
        return saveRecipe(openid, event.recipe || {});
      case 'deleteRecipe':
        return deleteRecipe(openid, event.id);
      case 'listFavorites':
        return listFavorites(openid);
      case 'saveFavorite':
        return saveFavorite(openid, event);
      case 'deleteFavorite':
        return deleteFavorite(openid, event);
      default:
        throw appError('UNKNOWN_ACTION', `UNKNOWN_ACTION: ${action}`);
    }
  } catch (err) {
    const code = err && err.code ? err.code : (err && err.message ? err.message : 'KITCHEN_FAILED');
    console.error('kitchen action failed', event.action, err);
    return {
      error: code,
      message: err && err.message ? err.message : String(err || code)
    };
  }
};
