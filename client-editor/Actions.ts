type ActionTypes = {
  JOIN: string;
  DISCONNECTED: string;
  SYNC_CODE: string;
  CODE_CHANGE: string;
  JOINED: string;
};

const Actions: ActionTypes = {
  JOIN: 'join',
  DISCONNECTED: 'disconnected',
  SYNC_CODE: 'sync_code',
  CODE_CHANGE: 'code_change',
  JOINED: 'joined',
};

export default Actions;