const historyService = require('./history.service');
const historyValidation = require('./history.validation');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');

const add = catchAsync(async (req, res) => {
  const data = historyValidation.addHistory.parse(req.body);
  const history = await historyService.addHistory(req.user.id, data);
  success(res, { statusCode: 201, message: 'History recorded', data: history });
});

const getAll = catchAsync(async (req, res) => {
  const query = historyValidation.queryHistory.parse(req.query);
  const result = await historyService.getHistory(req.user.id, query);
  success(res, { data: result.history, meta: result.meta });
});

module.exports = { add, getAll };
