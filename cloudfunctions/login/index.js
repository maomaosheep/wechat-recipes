const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

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

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    const now = Date.now();
    const profile = event && event.profile ? event.profile : {};
    const nickName = profile.nickName || profile.nickname || '';
    const avatarUrl = profile.avatarUrl || '';

    if (!openid) {
      return {
        error: 'LOGIN_NO_OPENID',
        message: 'cloud.getWXContext did not return OPENID'
      };
    }

    await ensureCollection('users');
    const users = db.collection('users');
    const existed = await users.where({ openid }).limit(1).get();
    const payload = {
      openid,
      nickName,
      avatarUrl,
      updatedAt: now
    };

    if (existed.data.length) {
      const oldUser = existed.data[0];
      await users.doc(oldUser._id).update({
        data: {
          nickName: nickName || oldUser.nickName || '',
          avatarUrl: avatarUrl || oldUser.avatarUrl || '',
          updatedAt: now
        }
      });
    } else {
      await users.add({
        data: {
          ...payload,
          teamId: '',
          createdAt: now
        }
      });
    }

    const userRes = await users.where({ openid }).limit(1).get();
    const user = userRes.data[0] || {};

    return {
      openid,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      user: {
        openid,
        nickName: user.nickName || nickName || '',
        avatarUrl: user.avatarUrl || avatarUrl || '',
        teamId: user.teamId || ''
      }
    };
  } catch (err) {
    return {
      error: err && (err.message || err.errMsg) ? (err.message || err.errMsg) : 'LOGIN_CLOUD_FAILED',
      stack: err && err.stack ? err.stack : ''
    };
  }
};
