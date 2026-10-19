// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 执天玄玑六爻引擎 v0（零依赖单文件；卦爻辞取自公版《周易》；农历节气表由 lunar-python 离线生成）。本仓只读（只改过两处注释的措辞），改动回到引擎源头再同步。
/* ============================================================================
 * liuyao_engine.js — 六爻排盘引擎 v0
 * UMD 单文件，Node >= 18 与浏览器通用，零依赖。
 * 规则来源：公版古典规则（京房八宫 / 《增删卜易》《卜筮正宗》通行口径），
 * 农历与节气静态数据由 lunar-python 离线生成（tools/gen_tables.py），
 * 节气精度到「日」（月建粒度）。覆盖公历 1900-01-01 ~ 2100-12-31。
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.LiuyaoEngine = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ======================== 静态数据（生成注入，勿手改） ========================
  var TBL_YEAR0=1899;
var TBL_CNY=[74, 63, 83, 72, 61, 80, 68, 57, 77, 66, 54, 74, 62, 82, 70, 58, 78, 67, 55, 75, 65, 84, 72, 60, 80, 69, 56, 77, 66, 55, 74, 62, 81, 70, 58, 78, 68, 56, 75, 63, 83, 72, 59, 79, 69, 57, 77, 66, 54, 74, 61, 81, 70, 59, 78, 67, 56, 76, 63, 82, 72, 60, 79, 69, 57, 77, 66, 53, 73, 62, 81, 70, 59, 79, 67, 55, 75, 63, 82, 71, 60, 80, 69, 57, 77, 66, 84, 73, 61, 81, 70, 59, 79, 68, 55, 74, 63, 83, 71, 60, 80, 69, 56, 76, 65, 54, 73, 61, 82, 71, 58, 78, 67, 55, 74, 63, 83, 72, 60, 80, 69, 57, 76, 65, 54, 74, 61, 81, 70, 58, 77, 67, 55, 75, 63, 83, 72, 60, 79, 68, 56, 76, 65, 54, 74, 62, 81, 70, 58, 78, 66, 55, 75, 65, 83, 72, 60, 79, 68, 56, 76, 66, 53, 73, 61, 81, 69, 58, 78, 67, 55, 75, 63, 83, 71, 59, 79, 69, 56, 76, 66, 54, 73, 61, 81, 70, 58, 78, 67, 56, 74, 62, 82, 71, 59, 79, 69, 57, 76, 65, 53, 73];
var TBL_LM=[2773, 71378, 1874, 3749, 46666, 1611, 2715, 38230, 1386, 2905, 22354, 1874, 56101, 2853, 2635, 46251, 685, 1387, 19305, 3497, 64914, 3730, 3365, 47693, 2646, 694, 38325, 1748, 3753, 24210, 3730, 52518, 1323, 2647, 45750, 2906, 1748, 28361, 1865, 63123, 2707, 1323, 51803, 2733, 1386, 39765, 2980, 2889, 23187, 2709, 62765, 1334, 2733, 46506, 1458, 3493, 32074, 3402, 68245, 2711, 1366, 51893, 2773, 1746, 36517, 3749, 1610, 27799, 2715, 62810, 1386, 2921, 46930, 2898, 2853, 38475, 2635, 70827, 685, 1389, 52073, 3497, 3474, 40229, 3365, 88653, 2646, 694, 50613, 1749, 3753, 48786, 3730, 3366, 27222, 2647, 70870, 858, 1749, 46793, 1865, 1683, 38187, 1323, 2651, 21850, 1386, 64341, 2980, 2889, 47763, 2709, 1325, 35501, 2741, 79274, 1490, 3493, 56650, 3402, 3221, 38190, 1366, 2741, 21938, 1746, 52901, 1829, 1611, 44183, 3243, 1370, 27350, 2921, 96082, 2898, 2853, 55883, 2635, 1195, 42331, 1453, 2922, 23378, 3474, 64805, 3365, 2645, 46253, 1206, 1461, 28074, 3785, 73362, 3730, 3366, 51798, 2647, 1238, 34517, 1877, 1865, 28307, 1683, 62763, 1323, 2651, 46426, 1386, 2917, 38730, 2890, 72341, 2709, 1325, 51885, 2741, 1450, 35749, 3493, 3402, 31893, 3222, 63822, 1366, 2741, 46514, 1746, 3749, 36426, 1675, 68759, 1195, 1371, 51926, 2922, 1874, 38693, 2885, 2699, 21659, 1195];
var TBL_JIE=[4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 7, 8, 8, 8, 9, 8, 8, 6, 5, 7, 6, 7, 7, 8, 9, 9, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 7, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 7, 6, 7, 7, 8, 9, 9, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 7, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 7, 6, 7, 7, 8, 9, 9, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 7, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 7, 8, 8, 9, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 7, 8, 8, 9, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 7, 8, 8, 9, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 7, 8, 8, 9, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 7, 8, 8, 8, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 6, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 6, 5, 5, 6, 7, 8, 8, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 5, 5, 6, 7, 7, 8, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 5, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 5, 5, 6, 7, 7, 8, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 5, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 5, 5, 6, 7, 7, 8, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 5, 5, 6, 7, 7, 7, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 5, 5, 6, 7, 7, 7, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 6, 5, 5, 6, 7, 8, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 5, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 6, 4, 6, 5, 6, 6, 8, 8, 8, 9, 8, 8, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 5, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 5, 5, 5, 6, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 5, 5, 5, 6, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 9, 8, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 6, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 6, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 8, 7, 7, 6, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 6, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 8, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 6, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 6, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 6, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 6, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 6, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 6, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 6, 5, 5, 6, 7, 7, 8, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 6, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 7, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 6, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 7, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 5, 5, 6, 7, 7, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 4, 5, 6, 6, 7, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 4, 5, 6, 6, 7, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 4, 5, 6, 6, 7, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 7, 5, 4, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 4, 4, 5, 6, 6, 7, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 7, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 4, 4, 4, 5, 6, 6, 6, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 4, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 7, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 4, 4, 4, 4, 6, 6, 6, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 7, 7, 6, 4, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 4, 4, 4, 4, 6, 6, 6, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 7, 7, 7, 6, 6, 4, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 4, 4, 4, 4, 6, 6, 6, 7, 6, 6, 5, 3, 5, 4, 5, 5, 6, 6, 7, 7, 6, 6, 4, 3, 5, 4, 5, 5, 6, 7, 7, 8, 7, 6, 5, 3, 5, 4, 5, 5, 7, 7, 7, 8, 7, 7, 5, 4, 5, 5, 5, 5, 7, 7, 7, 8, 7, 7, 5];

  // ======================== 基础常量 ========================
  var STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var JIAZI = [];
  for (var i = 0; i < 60; i++) JIAZI.push(STEMS[i % 10] + BRANCHES[i % 12]);

  // 八卦：先天序 1乾 2兑 3离 4震 5巽 6坎 7艮 8坤；爻初爻在前，阳=1 阴=0
  var TRIGRAM_NAMES = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']; // index = 先天数-1
  var TRIGRAM_LINES = [
    [1, 1, 1], [1, 1, 0], [1, 0, 1], [1, 0, 0],
    [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0]
  ];
  function trigramByNumber(n) { return n - 1; } // n in 1..8 -> index 0..7
  function modTrigram(x) { var r = x % 8; return r === 0 ? 8 : r; } // 余 0 取 8（坤）

  // 六十四卦名表：行=上卦（先天序 0..7），列=下卦
  var HEX_NAMES = [
    ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遯', '天地否'],
    ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
    ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
    ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
    ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
    ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
    ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
    ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地']
  ];

  var BRANCH_WUXING = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  // 五行生克：SHENG[a]=a所生；KE[a]=a所克
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

  // 纳甲：每卦 [内卦初到三, 外卦四到上]，index 同 TRIGRAM_NAMES
  var NAJIA = [
    ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'], // 乾
    ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未'], // 兑
    ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'], // 离
    ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'], // 震
    ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'], // 巽
    ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'], // 坎
    ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'], // 艮
    ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉']  // 坤
  ];

  var PALACE_WUXING = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };
  // 八宫生成：相对本宫纯卦需翻转的爻位（1-based）
  var STAGE_FLIPS = [[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5], [1, 2, 3, 5], [5]];
  var STAGE_NAMES = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'];
  var WORLD_POS = [6, 1, 2, 3, 4, 5, 4, 3];

  var LIU_HE_GUA = { 天地否: 1, 地天泰: 1, 泽水困: 1, 水泽节: 1, 火山旅: 1, 山火贲: 1, 雷地豫: 1, 地雷复: 1 };
  var LIU_CHONG_GUA = { 乾为天: 1, 兑为泽: 1, 离为火: 1, 震为雷: 1, 巽为风: 1, 坎为水: 1, 艮为山: 1, 坤为地: 1, 天雷无妄: 1, 雷天大壮: 1 };

  var JIN_SHEN = { 丑: '辰', 寅: '卯', 辰: '未', 巳: '午', 未: '戌', 申: '酉', 亥: '子' }; // 化进神
  var TUI_SHEN = { 辰: '丑', 卯: '寅', 未: '辰', 午: '巳', 戌: '未', 酉: '申', 子: '亥' }; // 化退神
  var MU = { 木: '未', 火: '戌', 金: '丑', 水: '辰', 土: '辰' }; // 五行之墓

  var LIU_SHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
  var LIU_HE_PAIRS = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };

  // 季节旺衰：state[season][wuxing]
  var SEASON_STATE = {
    春: { 木: '旺', 火: '相', 水: '休', 金: '囚', 土: '死' },
    夏: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' },
    秋: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' },
    冬: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' },
    四季: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' }
  };
  function seasonOfBranch(b) {
    if (b === '寅' || b === '卯') return '春';
    if (b === '巳' || b === '午') return '夏';
    if (b === '申' || b === '酉') return '秋';
    if (b === '亥' || b === '子') return '冬';
    return '四季'; // 辰戌丑未
  }

  // ======================== 历法层 ========================
  function jdn(y, m, d) {
    var a = ((14 - m) / 12) | 0;
    var y2 = y + 4800 - a;
    var m2 = m + 12 * a - 3;
    return d + (((153 * m2 + 2) / 5) | 0) + 365 * y2 + ((y2 / 4) | 0) - ((y2 / 100) | 0) + ((y2 / 400) | 0) - 32045;
  }
  var JDN_ANCHOR = jdn(1949, 10, 1); // 甲子日，六十甲子序号 0
  function pmod(n, m) { return ((n % m) + m) % m; }

  function dayPillarIndex(y, m, d) { return pmod(jdn(y, m, d) - JDN_ANCHOR, 60); }

  // 十二节顺序（与 TBL_JIE 每 12 个一组对应）：立春 惊蛰 清明 立夏 芒种 小暑 立秋 白露 寒露 立冬 大雪 小寒
  // 各节所在公历月：
  var JIE_MONTH = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1];
  // 各节对应的月建地支 index：
  var JIE_BRANCH = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]; // 寅卯辰巳午未申酉戌亥子丑

  function jieDay(y, jieIdx) { return TBL_JIE[(y - TBL_YEAR0) * 12 + jieIdx]; }

  // 找某公历日期所处的「节」：返回 {branchIdx, yearForStem}
  function monthBranchAndYear(y, m, d) {
    // 候选节事件：上一年大雪，本年 12 节
    var events = [];
    events.push({ y: y - 1, m: 12, d: jieDay(y - 1, 10), branch: 0 }); // 上年大雪 -> 子月
    for (var k = 0; k < 12; k++) {
      events.push({ y: y, m: JIE_MONTH[k], d: jieDay(y, k), branch: JIE_BRANCH[k], lichun: k === 0 });
    }
    events.sort(function (a, b) { return jdn(a.y, a.m, a.d) - jdn(b.y, b.m, b.d); });
    var cur = events[0];
    var t = jdn(y, m, d);
    for (var i = 0; i < events.length; i++) {
      if (jdn(events[i].y, events[i].m, events[i].d) <= t) cur = events[i];
      else break;
    }
    // 年柱以立春为界
    var lichunDay = jieDay(y, 0);
    var effYear = (jdn(y, m, d) >= jdn(y, 2, lichunDay)) ? y : y - 1;
    return { branchIdx: cur.branch, effYear: effYear };
  }

  // 五虎遁：年干 -> 正月（寅月）天干
  var HU_DUN = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 甲->丙 乙->戊 丙->庚 丁->壬 戊->甲 己->丙 ...

  function ganzhiOf(y, m, d, hour, minute, opts) {
    var lateZi = !opts || opts.lateZiSwitch !== false; // 默认 true
    var dy = y, dm = m, dd = d;
    if (lateZi && hour === 23) {
      // 晚子时：日柱按次日
      var j = jdn(y, m, d) + 1;
      var c = jdnToCivil(j);
      dy = c.y; dm = c.m; dd = c.d;
    }
    var dayIdx = dayPillarIndex(dy, dm, dd);
    var mb = monthBranchAndYear(dy, dm, dd);
    var yearStem = pmod(mb.effYear - 4, 10);
    var yearBranch = pmod(mb.effYear - 4, 12);
    var monthStem = pmod(HU_DUN[yearStem] + pmod(mb.branchIdx - 2, 12), 10);
    var hourBranch = (((hour + 1) % 24) / 2) | 0;
    // 五鼠遁：日干 -> 子时天干
    var SHU_DUN = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]; // 甲己->甲 乙庚->丙 丙辛->戊 丁壬->庚 戊癸->壬
    var hourStem = pmod(SHU_DUN[dayIdx % 10] + hourBranch, 10);
    return {
      year: STEMS[yearStem] + BRANCHES[yearBranch],
      month: STEMS[monthStem] + BRANCHES[mb.branchIdx],
      day: JIAZI[dayIdx],
      hour: STEMS[hourStem] + BRANCHES[hourBranch],
      _dayIdx: dayIdx, _monthBranchIdx: mb.branchIdx, _yearBranchIdx: yearBranch
    };
  }

  function jdnToCivil(j) {
    var a = j + 32044;
    var b = ((4 * a + 3) / 146097) | 0;
    var c = a - ((146097 * b) / 4 | 0);
    var d2 = ((4 * c + 3) / 1461) | 0;
    var e = c - ((1461 * d2) / 4 | 0);
    var m = ((5 * e + 2) / 153) | 0;
    var day = e - (((153 * m + 2) / 5) | 0) + 1;
    var month = m + 3 - 12 * ((m / 10) | 0);
    var year = 100 * b + d2 - 4800 + ((m / 10) | 0);
    return { y: year, m: month, d: day };
  }

  // 农历换算：公历 -> {year, month, day, isLeap}（lunar year 为该日期所在农历年）
  function toLunar(y, m, d) {
    if (y < 1900 || y > 2100) throw new Error('lunar table covers 1900-2100 only');
    var ly = y;
    var cnyCode = TBL_CNY[ly - TBL_YEAR0];
    var cm = (cnyCode / 32) | 0, cd = cnyCode % 32;
    if (m < cm || (m === cm && d < cd)) {
      ly = y - 1;
      cnyCode = TBL_CNY[ly - TBL_YEAR0];
      cm = (cnyCode / 32) | 0; cd = cnyCode % 32;
    }
    var daysSinceCny = jdn(y, m, d) - jdn(ly, cm, cd);
    var lmCode = TBL_LM[ly - TBL_YEAR0];
    var leapMonth = (lmCode / 8192) | 0;
    var mask = lmCode % 8192;
    // 展开 slots：1..12，闰月插在其月份后
    var slots = [];
    var bi = 0;
    for (var mon = 1; mon <= 12; mon++) {
      slots.push({ month: mon, leap: false, days: (mask >> bi) & 1 ? 30 : 29 }); bi++;
      if (leapMonth === mon) { slots.push({ month: mon, leap: true, days: (mask >> bi) & 1 ? 30 : 29 }); bi++; }
    }
    var rest = daysSinceCny;
    for (var s = 0; s < slots.length; s++) {
      if (rest < slots[s].days) {
        return { year: ly, month: slots[s].month, day: rest + 1, isLeap: slots[s].leap };
      }
      rest -= slots[s].days;
    }
    throw new Error('lunar conversion overflow for ' + y + '-' + m + '-' + d);
  }

  // ======================== 装卦层 ========================
  function linesKey(lines) { return lines.join(''); }

  // 建八宫表：key=六爻(初爻在前) -> {palaceIdx, stage}
  var PALACE_MAP = {};
  var PALACE_ORDER = [0, 1, 2, 3, 4, 5, 6, 7]; // 乾兑离震巽坎艮坤
  PALACE_ORDER.forEach(function (p) {
    var base = TRIGRAM_LINES[p].concat(TRIGRAM_LINES[p]);
    for (var st = 0; st < 8; st++) {
      var lines = base.slice();
      STAGE_FLIPS[st].forEach(function (pos) { lines[pos - 1] ^= 1; });
      PALACE_MAP[linesKey(lines)] = { palaceIdx: p, stage: st };
    }
  });

  function trigramIndexOfLines(l3) {
    for (var t = 0; t < 8; t++) {
      if (TRIGRAM_LINES[t][0] === l3[0] && TRIGRAM_LINES[t][1] === l3[1] && TRIGRAM_LINES[t][2] === l3[2]) return t;
    }
    return -1;
  }

  function hexNameOf(lines) {
    var lo = trigramIndexOfLines(lines.slice(0, 3));
    var up = trigramIndexOfLines(lines.slice(3, 6));
    return HEX_NAMES[up][lo];
  }

  function najiaOf(lines) {
    var lo = trigramIndexOfLines(lines.slice(0, 3));
    var up = trigramIndexOfLines(lines.slice(3, 6));
    var arr = [];
    for (var i = 0; i < 3; i++) arr.push(NAJIA[lo][i]);
    for (var j = 3; j < 6; j++) arr.push(NAJIA[up][j]);
    return arr;
  }

  function liuqinOf(palaceWx, yaoWx) {
    if (palaceWx === yaoWx) return '兄弟';
    if (SHENG[yaoWx] === palaceWx) return '父母';  // 爻生宫 = 生我
    if (SHENG[palaceWx] === yaoWx) return '子孙';  // 宫生爻 = 我生
    if (KE[yaoWx] === palaceWx) return '官鬼';     // 爻克宫 = 克我
    if (KE[palaceWx] === yaoWx) return '妻财';     // 宫克爻 = 我克
    return '?';
  }

  function clashBranch(b) { return BRANCHES[(BRANCHES.indexOf(b) + 6) % 12]; }

  function voidBranchesOfDay(dayIdx) {
    var xunFirst = dayIdx - (dayIdx % 10);
    var b0 = xunFirst % 12;
    return [BRANCHES[(b0 + 10) % 12], BRANCHES[(b0 + 11) % 12]];
  }

  // ======================== 主构建 ========================
  function buildChart(yaos, dt, inputInfo) {
    if (!Array.isArray(yaos) || yaos.length !== 6) throw new Error('yaos must be 6 values');
    yaos.forEach(function (v) { if ([6, 7, 8, 9].indexOf(v) < 0) throw new Error('yao value must be 6/7/8/9, got ' + v); });
    var opts = inputInfo || {};
    var gz = ganzhiOf(dt.year, dt.month, dt.day, dt.hour, dt.minute || 0, opts);
    var lunar = toLunar(dt.year, dt.month, dt.day);

    var lines = yaos.map(function (v) { return (v === 7 || v === 9) ? 1 : 0; });
    var changing = yaos.map(function (v) { return v === 6 || v === 9; });
    var hasChanging = changing.some(Boolean);
    var changedLines = lines.slice();
    changing.forEach(function (c, i) { if (c) changedLines[i] ^= 1; });

    var originalName = hexNameOf(lines);
    var changedName = hasChanging ? hexNameOf(changedLines) : null;
    // 互卦：二三四为下互、三四五为上互
    var mutualLines = [lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]];
    var mutualName = hexNameOf(mutualLines);

    var pm = PALACE_MAP[linesKey(lines)];
    var palaceName = TRIGRAM_NAMES[pm.palaceIdx];
    var palaceWx = PALACE_WUXING[palaceName];
    var stage = pm.stage;
    var worldPos = WORLD_POS[stage]; // 1-based
    var responsePos = ((worldPos + 2) % 6) + 1;

    var najia = najiaOf(lines);
    var changedNajia = hasChanging ? najiaOf(changedLines) : null;

    var dayBranch = gz.day[1];
    var dayStem = gz.day[0];
    var monthBranch = BRANCHES[gz._monthBranchIdx];
    var voids = voidBranchesOfDay(gz._dayIdx);
    var season = seasonOfBranch(monthBranch);

    // 六神起点
    var stemIdx = STEMS.indexOf(dayStem);
    var godStart = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5][stemIdx];

    var yaosDetail = [];
    var presentLiuqin = {};
    for (var p = 0; p < 6; p++) {
      var gzStr = najia[p];
      var zhi = gzStr[1];
      var wx = BRANCH_WUXING[zhi];
      var lq = liuqinOf(palaceWx, wx);
      presentLiuqin[lq] = true;
      var isDayClash = clashBranch(dayBranch) === zhi;
      var seasonState = SEASON_STATE[season][wx];
      var isLinYueJian = BRANCH_WUXING[monthBranch] === wx;
      var strong = (seasonState === '旺' || seasonState === '相') || isLinYueJian;
      var detail = {
        position: p + 1,
        rawValue: yaos[p],
        line: lines[p],
        najiaGan: gzStr[0],
        najiaZhi: zhi,
        wuxing: wx,
        liuQin: lq,
        liuShen: LIU_SHEN[(godStart + p) % 6],
        isWorld: p + 1 === worldPos,
        isResponse: p + 1 === responsePos,
        isChanging: changing[p],
        changeType: yaos[p] === 9 ? '老阳' : yaos[p] === 6 ? '老阴' : yaos[p] === 7 ? '少阳' : '少阴',
        isVoid: voids.indexOf(zhi) >= 0,
        isMonthBreak: clashBranch(monthBranch) === zhi,
        isDayClash: isDayClash,
        isDarkMove: !changing[p] && isDayClash && strong,   // 旺相静爻逢日冲 = 暗动
        isDayBreak: !changing[p] && isDayClash && !strong,  // 休囚静爻逢日冲 = 日破
        isLiuHeDay: LIU_HE_PAIRS[dayBranch] === zhi,
        isLinYueJian: isLinYueJian,
        seasonState: seasonState,
        changedYao: null
      };
      if (changing[p]) {
        var cGz = changedNajia[p];
        var cZhi = cGz[1];
        var cWx = BRANCH_WUXING[cZhi];
        var relations = [];
        if (SHENG[cWx] === wx) relations.push('回头生');
        if (KE[cWx] === wx) relations.push('回头克');
        if (voids.indexOf(cZhi) >= 0) relations.push('化空');
        if (MU[wx] === cZhi) relations.push('化墓');
        if (clashBranch(zhi) === cZhi) relations.push('化冲');
        var dir = null;
        if (JIN_SHEN[zhi] === cZhi) dir = '化进神';
        else if (TUI_SHEN[zhi] === cZhi) dir = '化退神';
        detail.changedYao = {
          zhi: cZhi,
          gan: cGz[0],
          wuxing: cWx,
          liuQin: liuqinOf(palaceWx, cWx),
          isVoid: voids.indexOf(cZhi) >= 0,
          changeDirection: dir,
          changeRelations: relations
        };
      }
      yaosDetail.push(detail);
    }

    // 伏神：卦中缺的六亲，到本宫首卦同位取
    var hiddenSpirits = [];
    var ALL_LQ = ['父母', '子孙', '官鬼', '妻财', '兄弟'];
    var missing = ALL_LQ.filter(function (q) { return !presentLiuqin[q]; });
    if (missing.length) {
      var firstLines = TRIGRAM_LINES[pm.palaceIdx].concat(TRIGRAM_LINES[pm.palaceIdx]);
      var firstNajia = najiaOf(firstLines);
      missing.forEach(function (q) {
        for (var fp = 0; fp < 6; fp++) {
          var fZhi = firstNajia[fp][1];
          var fWx = BRANCH_WUXING[fZhi];
          if (liuqinOf(palaceWx, fWx) === q) {
            hiddenSpirits.push({
              liuQin: q,
              position: fp + 1,
              zhi: fZhi,
              wuxing: fWx,
              isVoid: voids.indexOf(fZhi) >= 0,
              underYaoPosition: fp + 1
            });
            break;
          }
        }
      });
    }

    // 六合 / 六冲 / 卦变过渡
    var isLiuHe = !!LIU_HE_GUA[originalName];
    var isLiuChong = !!LIU_CHONG_GUA[originalName];
    var transition = null;
    if (changedName) {
      var cHe = !!LIU_HE_GUA[changedName];
      var cChong = !!LIU_CHONG_GUA[changedName];
      if (isLiuHe && cChong) transition = '六合化六冲';
      else if (isLiuChong && cHe) transition = '六冲化六合';
      else if (isLiuHe && cHe) transition = '六合化六合';
      else if (isLiuChong && cChong) transition = '六冲化六冲';
    }

    // 反吟伏吟
    var fanyin = [];
    var fuyin = [];
    if (hasChanging) {
      for (var q = 0; q < 6; q++) {
        if (!changing[q]) continue;
        var oZhi = najia[q][1], cZhi2 = changedNajia[q][1];
        if (clashBranch(oZhi) === cZhi2) fanyin.push({ kind: '爻反吟', position: q + 1 });
        if (oZhi === cZhi2) fuyin.push({ kind: '爻伏吟', position: q + 1 });
      }
      // 卦反吟：内卦（1-3）或外卦（4-6）同位爻皆冲，且该卦有动爻
      [['内卦', 0], ['外卦', 3]].forEach(function (sc) {
        var off = sc[1], anyMove = false, allClash = true, allSame = true;
        for (var k = 0; k < 3; k++) {
          var pos = off + k;
          if (changing[pos]) anyMove = true;
          if (clashBranch(najia[pos][1]) !== changedNajia[pos][1]) allClash = false;
          if (najia[pos][1] !== changedNajia[pos][1]) allSame = false;
        }
        if (anyMove && allClash) fanyin.push({ kind: '卦反吟', scope: sc[0] });
        if (anyMove && allSame) fuyin.push({ kind: '卦伏吟', scope: sc[0] });
      });
    }

    // ======================== v0.1 增量 1：应期候选 ========================
    // 机制：空亡->填实/冲空；月破->逢值/逢合/出月；动爻->逢值/逢合；伏神->冲飞出伏（冲飞神、冲伏神两条）。
    // 去重键 = (mechanism, triggerBranch)，重复时含义合并。
    function pushTiming(list, mechanism, triggerBranch, meaning) {
      for (var ti = 0; ti < list.length; ti++) {
        if (list[ti].mechanism === mechanism && list[ti].triggerBranch === triggerBranch) {
          if (list[ti].meaning.indexOf(meaning) < 0) list[ti].meaning += '；' + meaning;
          return;
        }
      }
      list.push({ mechanism: mechanism, triggerBranch: triggerBranch, meaning: meaning });
    }
    function yaoTiming(d) {
      var list = [];
      if (d.isVoid) {
        pushTiming(list, '填实', d.najiaZhi, '空亡填实，逢本支（' + d.najiaZhi + '）值期');
        pushTiming(list, '冲空', clashBranch(d.najiaZhi), '冲空则实，逢冲支（' + clashBranch(d.najiaZhi) + '）值期');
      }
      if (d.isMonthBreak) {
        pushTiming(list, '逢值', d.najiaZhi, '月破逢值，本支（' + d.najiaZhi + '）值期');
        pushTiming(list, '逢合', LIU_HE_PAIRS[d.najiaZhi], '月破逢合，六合支（' + LIU_HE_PAIRS[d.najiaZhi] + '）值期');
        pushTiming(list, '出月', monthBranch, '出本月后逢月建之支（' + monthBranch + '）值期，月破得解');
      }
      if (d.isChanging) {
        pushTiming(list, '逢值', d.najiaZhi, '动爻逢值，本支（' + d.najiaZhi + '）值期');
        pushTiming(list, '逢合', LIU_HE_PAIRS[d.najiaZhi], '动爻逢合，六合支（' + LIU_HE_PAIRS[d.najiaZhi] + '）值期');
      }
      return list;
    }
    yaosDetail.forEach(function (d) { d.timingCandidates = yaoTiming(d); });
    hiddenSpirits.forEach(function (h) {
      var flyingZhi = yaosDetail[h.underYaoPosition - 1].najiaZhi;
      var list = [];
      pushTiming(list, '冲飞出伏', clashBranch(flyingZhi), '冲飞神（' + flyingZhi + '），伏神得出');
      pushTiming(list, '冲飞出伏', clashBranch(h.zhi), '冲伏神本支（' + h.zhi + '），引伏而出');
      h.timingCandidates = list;
    });
    // 顶层汇总：用神候选口径 = 世爻 / 动爻 / 空亡 / 月破之爻 + 全部伏神
    var timingSummary = [];
    yaosDetail.forEach(function (d) {
      if (!(d.isWorld || d.isChanging || d.isVoid || d.isMonthBreak)) return;
      d.timingCandidates.forEach(function (c) {
        timingSummary.push({
          source: { kind: '爻', position: d.position, liuQin: d.liuQin, zhi: d.najiaZhi },
          mechanism: c.mechanism, triggerBranch: c.triggerBranch, meaning: c.meaning
        });
      });
    });
    hiddenSpirits.forEach(function (h) {
      h.timingCandidates.forEach(function (c) {
        timingSummary.push({
          source: { kind: '伏神', position: h.position, liuQin: h.liuQin, zhi: h.zhi },
          mechanism: c.mechanism, triggerBranch: c.triggerBranch, meaning: c.meaning
        });
      });
    });

    // ======================== v0.2 增量 1：应期真日期 ========================
    // 每条 timingCandidate / timingSummary 补 timingReal={days, month}：
    //   days  = 从起卦日（晚子时日柱已换次日时从次日算起）往后 40 天内最近 3 次该支日，
    //           格式 'YYYY-MM-DD（干支）'，日干支用 60 甲子循环（JDN 锚点，与引擎日柱同一逻辑）；
    //   month = 该支对应的节气月区间 'YYYY-MM-DD～YYYY-MM-DD（X月）'：
    //           起卦时刻正处该支月内时给当月整月区间，否则给下一个该支月；
    //           月界用内嵌节气表（日精度）：寅=立春 卯=惊蛰 辰=清明 巳=立夏 午=芒种 未=小暑
    //           申=立秋 酉=白露 戌=寒露 亥=立冬 子=大雪 丑=小寒；支无对应月建时给 null。
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function fmtDate(c) { return c.y + '-' + pad2(c.m) + '-' + pad2(c.d); }
    var lateZiEff = opts.lateZiSwitch !== false;
    var baseJdn = jdn(dt.year, dt.month, dt.day) + (lateZiEff && dt.hour === 23 ? 1 : 0);
    function timingRealDays(branch) {
      var out = [];
      for (var j = baseJdn; j <= baseJdn + 39 && out.length < 3; j++) {
        var c = jdnToCivil(j);
        var idx = dayPillarIndex(c.y, c.m, c.d);
        if (JIAZI[idx][1] === branch) out.push(fmtDate(c) + '（' + JIAZI[idx] + '）');
      }
      return out;
    }
    function timingRealMonth(branch) {
      var bi = BRANCHES.indexOf(branch);
      var k = JIE_BRANCH.indexOf(bi);
      if (k < 0) return null; // 支无对应月建
      var startCiv = jdnToCivil(baseJdn);
      var start = null;
      if (bi === gz._monthBranchIdx) {
        // 起卦时刻正处该支当值的节气月内（如「出月」机制 triggerBranch=月建本支）：
        // 给当月整月区间（起点=本月节日=最近一次 <= 起卦日的该节），不跳次年。
        for (var y0 = startCiv.y + 1; y0 >= startCiv.y - 1 && !start; y0--) {
          var d0 = jieDay(y0, k);
          if (jdn(y0, JIE_MONTH[k], d0) <= baseJdn) start = { y: y0, m: JIE_MONTH[k], d: d0 };
        }
      } else {
        // 当前不在该支月内：给下一个该支月（首个节日 >= 起卦日）
        for (var yy = startCiv.y - 1; yy <= startCiv.y + 2 && !start; yy++) {
          var dd = jieDay(yy, k);
          if (jdn(yy, JIE_MONTH[k], dd) >= baseJdn) start = { y: yy, m: JIE_MONTH[k], d: dd };
        }
      }
      if (!start) return null;
      var k2 = (k + 1) % 12; // 下一节为本节气月终点
      var endY = start.y + (JIE_MONTH[k2] < JIE_MONTH[k] ? 1 : 0);
      var endCiv = jdnToCivil(jdn(endY, JIE_MONTH[k2], jieDay(endY, k2)) - 1);
      return fmtDate(start) + '～' + fmtDate(endCiv) + '（' + branch + '月）';
    }
    var trCache = {};
    function timingRealOf(branch) {
      if (!trCache[branch]) trCache[branch] = { days: timingRealDays(branch), month: timingRealMonth(branch) };
      return trCache[branch];
    }
    yaosDetail.forEach(function (d) { d.timingCandidates.forEach(function (c) { c.timingReal = timingRealOf(c.triggerBranch); }); });
    hiddenSpirits.forEach(function (h) { h.timingCandidates.forEach(function (c) { c.timingReal = timingRealOf(c.triggerBranch); }); });
    timingSummary.forEach(function (c) { c.timingReal = timingRealOf(c.triggerBranch); });

    // ======================== v0.1 增量 2：三刑 / 三合局 ========================
    // 支来源登记：卦内六爻 + 伏神 + 日辰 + 月建
    var branchSources = {};
    function addSource(b, label) {
      if (!branchSources[b]) branchSources[b] = [];
      branchSources[b].push(label);
    }
    yaosDetail.forEach(function (d) { addSource(d.najiaZhi, '爻' + d.position); });
    hiddenSpirits.forEach(function (h) { addSource(h.zhi, '伏神' + h.position); });
    addSource(dayBranch, '日辰');
    addSource(monthBranch, '月建');
    var chartBranches = {}; // 卦内（爻+伏神）出现计数
    yaosDetail.forEach(function (d) { chartBranches[d.najiaZhi] = (chartBranches[d.najiaZhi] || 0) + 1; });
    hiddenSpirits.forEach(function (h) { chartBranches[h.zhi] = (chartBranches[h.zhi] || 0) + 1; });

    var SAN_XING_GROUPS = [
      { type: '恃势之刑', branches: ['寅', '巳', '申'] },
      { type: '无恩之刑', branches: ['丑', '戌', '未'] },
      { type: '无礼之刑', branches: ['子', '卯'] }
    ];
    var sanXing = [];
    SAN_XING_GROUPS.forEach(function (g) {
      var inChart = g.branches.filter(function (b) { return chartBranches[b]; });
      var present = g.branches.filter(function (b) { return branchSources[b]; });
      var completeInChart = inChart.length === g.branches.length;
      var extra = [];
      if (!completeInChart) {
        if (dayBranch !== monthBranch) {
          var withDay = inChart.concat(g.branches.indexOf(dayBranch) >= 0 && !chartBranches[dayBranch] ? [dayBranch] : []);
          var withMonth = inChart.concat(g.branches.indexOf(monthBranch) >= 0 && !chartBranches[monthBranch] ? [monthBranch] : []);
          if (withDay.length === g.branches.length) extra.push('日辰');
          if (withMonth.length === g.branches.length) extra.push('月建');
        } else {
          var withDM = inChart.concat(g.branches.indexOf(dayBranch) >= 0 && !chartBranches[dayBranch] ? [dayBranch] : []);
          if (withDM.length === g.branches.length) extra.push('日辰', '月建');
        }
      }
      if (completeInChart || extra.length) {
        var src = {};
        present.forEach(function (b) { src[b] = branchSources[b]; });
        sanXing.push({
          type: g.type, branches: g.branches, presentBranches: present,
          complete: completeInChart, completedBy: extra, sources: src
        });
      }
    });
    // 自刑：辰午酉亥，卦内同支重现，或卦内一支逢日辰/月建同支
    ['辰', '午', '酉', '亥'].forEach(function (b) {
      var cnt = chartBranches[b] || 0;
      var extra = [];
      if (cnt >= 2) {
        sanXing.push({ type: '自刑', branches: [b, b], presentBranches: [b], complete: true, completedBy: [], sources: (function () { var s = {}; s[b] = branchSources[b]; return s; })() });
      } else if (cnt === 1) {
        if (dayBranch === b) extra.push('日辰');
        if (monthBranch === b) extra.push('月建');
        if (extra.length) {
          var s2 = {}; s2[b] = branchSources[b];
          sanXing.push({ type: '自刑', branches: [b, b], presentBranches: [b], complete: false, completedBy: extra, sources: s2 });
        }
      }
    });

    var SAN_HE_GROUPS = [
      { group: '申子辰', wuxing: '水', branches: ['申', '子', '辰'] },
      { group: '寅午戌', wuxing: '火', branches: ['寅', '午', '戌'] },
      { group: '巳酉丑', wuxing: '金', branches: ['巳', '酉', '丑'] },
      { group: '亥卯未', wuxing: '木', branches: ['亥', '卯', '未'] }
    ];
    var sanHe = [];
    SAN_HE_GROUPS.forEach(function (g) {
      var present = g.branches.filter(function (b) { return branchSources[b]; });
      if (present.length < 2) return;
      var missing = g.branches.filter(function (b) { return !branchSources[b]; });
      var src = {};
      present.forEach(function (b) { src[b] = branchSources[b]; });
      sanHe.push({
        group: g.group, wuxing: g.wuxing,
        presentBranches: present, missingBranches: missing,
        complete: present.length === 3,   // 三支齐全=成局（含日辰月建参与），两支=半合
        half: present.length === 2,
        sources: src
      });
    });

    // ======================== v0.1 增量 3：卦身 ========================
    // 诀：阳世从子起、阴世从午起，从初爻数到世爻位。
    var worldLine = lines[worldPos - 1];
    var gsStart = worldLine === 1 ? 0 : 6; // 子=0 / 午=6
    var gsBranch = BRANCHES[(gsStart + worldPos - 1) % 12];
    var guaShen = { branch: gsBranch, liuQin: liuqinOf(palaceWx, BRANCH_WUXING[gsBranch]) };

    // ======================== v0.3 增量 1：代占入参校验（古法口径） ========================
    // asker: 'self'（本人问，现状）| 'proxy_asked'（本人托人代问：世爻仍当本人，用神照 question_type 取）
    //        | 'proxy_self'（问卦人自替他人操心问：必须传 subject，先立「人位」）
    // subject: friend→兄弟 / parent→父母 / child→子孙 / partner→按 gender（female→官鬼、male→妻财、
    //          未给 gender→应爻并记 note:'partner 未给性别取应爻'）。
    //          仅 proxy_self 时必填；其余 asker 下传了则忽略并入 warnings[]。
    // judgment 粗判增补（proxy_self）：人位空破受克 → verdict 压一档（成→悬、悬→不成）；
    //          人位即主用神时（代问病）其状态已计入 judgeOccurrence 评分，不重复压档。
    var warnings = [];
    var asker = opts.asker || 'self';
    if (['self', 'proxy_asked', 'proxy_self'].indexOf(asker) < 0) throw new Error("asker must be 'self' | 'proxy_asked' | 'proxy_self'");
    var subject = (opts.subject === undefined || opts.subject === null) ? null : opts.subject;
    if (subject !== null && ['friend', 'parent', 'child', 'partner'].indexOf(subject) < 0) throw new Error("subject must be 'friend' | 'parent' | 'child' | 'partner'");
    if (asker === 'proxy_self' && subject === null) throw new Error("asker='proxy_self' 必须传 subject（friend/parent/child/partner）");
    if (asker !== 'proxy_self' && subject !== null) { warnings.push("subject 仅在 asker='proxy_self' 时有效，已忽略"); subject = null; }

    // ======================== v0.2 增量 2：用神自动选取 + 旺衰汇总 ========================
    // question_type 九键（跟玄玑接口同一套，一字不改）：
    //   career relationship contact money litigation travel_near travel_far travel_abroad recovery
    // gender: male / female；不给则走「不按性别取用」路径。
    // 用神映射（口径钉死，不自创）：
    //   career:               主=官鬼，辅=父母（单位文书）
    //   relationship:         female→官鬼；male→妻财；无 gender→官鬼+妻财同列+应爻
    //   contact:              主=父母（音信），辅=应爻（对方）
    //   money:                妻财
    //   litigation:           官鬼＋世应关系
    //   travel_near/travel_far: 世爻＋应爻（所往之地）
    //   travel_abroad:        父母（护照文书）＋世爻＋应爻
    //   recovery:             官鬼=病、子孙=医药、世爻=自己（三样都列，标注角色）
    // judgment 粗判规则（候选，给模型参考，规则写死于此）：
    //   加分：旺/相 +2；临月建 +2；月建或日辰生/比和 各 +1；动而化进神或回头生 +2；动爻来生 +1
    //   减分：空亡 -2；月破 -2；月建或日辰克 各 -2；月建或日辰冲 各 -1；动而化退神/回头克/化空 -2；
    //         动爻来克 -2；囚/死 -1
    //   判定：伏藏（待出）上限「悬」；score>=2 → 成；score<=-2 → 不成；其余 → 悬。
    var QT_KEYS = ['career', 'relationship', 'contact', 'money', 'litigation', 'travel_near', 'travel_far', 'travel_abroad', 'recovery'];
    function roleSpecs(qt, gender) {
      switch (qt) {
        case 'career': return [{ role: '用神', liuQin: '官鬼' }, { role: '辅神', liuQin: '父母' }];
        case 'relationship':
          if (gender === 'female') return [{ role: '用神', liuQin: '官鬼' }];
          if (gender === 'male') return [{ role: '用神', liuQin: '妻财' }];
          return [{ role: '用神', liuQin: '官鬼' }, { role: '用神', liuQin: '妻财' }, { role: '辅神', ref: '应爻' }];
        case 'contact': return [{ role: '用神', liuQin: '父母' }, { role: '辅神', ref: '应爻' }];
        case 'money': return [{ role: '用神', liuQin: '妻财' }];
        case 'litigation': return [{ role: '用神', liuQin: '官鬼' }, { role: '辅神', ref: '世爻' }, { role: '辅神', ref: '应爻' }];
        case 'travel_near': case 'travel_far':
          return [{ role: '用神', ref: '世爻' }, { role: '用神', ref: '应爻' }];
        case 'travel_abroad':
          return [{ role: '用神', liuQin: '父母' }, { role: '用神', ref: '世爻' }, { role: '用神', ref: '应爻' }];
        case 'recovery':
          return [{ role: '病', liuQin: '官鬼' }, { role: '医药', liuQin: '子孙' }, { role: '自己', ref: '世爻' }];
      }
      return null;
    }
    function yaoOccurrence(role, d) {
      return {
        role: role, liuQin: d.liuQin, where: '明现', position: d.position, zhi: d.najiaZhi, wuxing: d.wuxing,
        isVoid: d.isVoid, isMonthBreak: d.isMonthBreak, seasonState: d.seasonState,
        isChanging: d.isChanging, isWorld: d.isWorld, isResponse: d.isResponse
      };
    }
    function hiddenOccurrence(role, h) {
      return {
        role: role, liuQin: h.liuQin, where: '伏藏', underPosition: h.underYaoPosition, zhi: h.zhi, wuxing: h.wuxing,
        isVoid: h.isVoid, isMonthBreak: clashBranch(monthBranch) === h.zhi,
        seasonState: SEASON_STATE[season][h.wuxing], isChanging: false
      };
    }
    // 主次比较键：明>伏、动>静、旺>衰、不空不破优先（按此序字典序）
    function occKey(o) {
      return [o.where === '明现' ? 1 : 0, o.isChanging ? 1 : 0,
        (o.seasonState === '旺' || o.seasonState === '相') ? 1 : 0,
        (!o.isVoid && !o.isMonthBreak) ? 1 : 0];
    }
    function keyGt(a, b) {
      for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
      return false;
    }
    // 来源支 -> 目标支 的关系（目标=用神）：冲/合/比和/生/克/泄（用神生来源）/耗（用神克来源）
    function relationOf(fromZhi, toZhi) {
      if (clashBranch(fromZhi) === toZhi) return '冲';
      if (LIU_HE_PAIRS[fromZhi] === toZhi) return '合';
      var fw = BRANCH_WUXING[fromZhi], tw = BRANCH_WUXING[toZhi];
      if (fw === tw) return '比和';
      if (SHENG[fw] === tw) return '生';
      if (KE[fw] === tw) return '克';
      if (SHENG[tw] === fw) return '泄';
      if (KE[tw] === fw) return '耗';
      return '?';
    }
    function relNote(fromLabel, fromZhi, type, o) {
      var fw = BRANCH_WUXING[fromZhi], tw = BRANCH_WUXING[o.zhi];
      var tgt = (o.role === '用神' ? '用神' : o.role) + o.zhi + tw;
      switch (type) {
        case '生': return fromLabel + fromZhi + fw + '生' + tgt;
        case '克': return fromLabel + fromZhi + fw + '克' + tgt;
        case '比和': return fromLabel + fromZhi + '与' + tgt + '比和';
        case '冲': return fromLabel + fromZhi + '冲' + tgt;
        case '合': return fromLabel + fromZhi + '与' + tgt + '六合';
        case '泄': return tgt + '生' + fromLabel + fromZhi + fw + '，泄气';
        case '耗': return tgt + '克' + fromLabel + fromZhi + fw + '，耗力';
      }
      return '';
    }
    function relationsFor(o) {
      var rel = [];
      rel.push({ from: '月建' + monthBranch, type: relationOf(monthBranch, o.zhi), note: relNote('月建', monthBranch, relationOf(monthBranch, o.zhi), o) });
      rel.push({ from: '日辰' + dayBranch, type: relationOf(dayBranch, o.zhi), note: relNote('日辰', dayBranch, relationOf(dayBranch, o.zhi), o) });
      yaosDetail.forEach(function (d) {
        if (!d.isChanging) return;
        if (o.where === '明现' && d.position === o.position) return; // 自身不列
        var t = relationOf(d.najiaZhi, o.zhi);
        rel.push({ from: '动爻' + d.position + d.najiaZhi, type: t, note: relNote('动爻' + d.position + ' ', d.najiaZhi, t, o) });
      });
      return rel;
    }
    function judgeOccurrence(o) {
      var score = 0, good = [], bad = [];
      if (o.seasonState === '旺' || o.seasonState === '相') { score += 2; good.push('季节' + o.seasonState); }
      else if (o.seasonState === '囚' || o.seasonState === '死') { score -= 1; bad.push('季节' + o.seasonState); }
      if (o.where === '明现' && o.zhi === monthBranch) { score += 2; good.push('临月建'); }
      var mT = relationOf(monthBranch, o.zhi), dT = relationOf(dayBranch, o.zhi);
      if (mT === '生' || mT === '比和') { score += 1; good.push('月建' + mT); }
      if (dT === '生' || dT === '比和') { score += 1; good.push('日辰' + dT); }
      if (mT === '克') { score -= 2; bad.push('月建克'); }
      if (dT === '克') { score -= 2; bad.push('日辰克'); }
      if (mT === '冲') { score -= 1; bad.push('月建冲'); }
      if (dT === '冲') { score -= 1; bad.push('日辰冲'); }
      if (o.isVoid) { score -= 2; bad.push('空亡'); }
      if (o.isMonthBreak) { score -= 2; bad.push('月破'); }
      if (o.where === '明现' && o.isChanging) {
        var cy = yaosDetail[o.position - 1].changedYao;
        if (cy) {
          if (cy.changeDirection === '化进神' || cy.changeRelations.indexOf('回头生') >= 0) { score += 2; good.push('动化吉'); }
          if (cy.changeDirection === '化退神' || cy.changeRelations.indexOf('回头克') >= 0 || cy.isVoid) { score -= 2; bad.push('动化凶'); }
        }
      }
      var keByMove = false, shengByMove = false;
      yaosDetail.forEach(function (d) {
        if (!d.isChanging) return;
        if (o.where === '明现' && d.position === o.position) return;
        var t = relationOf(d.najiaZhi, o.zhi);
        if (t === '克') keByMove = true;
        if (t === '生') shengByMove = true;
      });
      if (keByMove) { score -= 2; bad.push('动爻来克'); }
      if (shengByMove) { score += 1; good.push('动爻来生'); }
      var verdict;
      if (o.where === '伏藏') verdict = score <= -2 ? '不成' : '悬'; // 伏藏待出，上限「悬」
      else if (score >= 2) verdict = '成';
      else if (score <= -2) verdict = '不成';
      else verdict = '悬';
      var reason = (o.where === '明现' ? (o.position + '爻' + o.liuQin + o.zhi + o.wuxing) : ('伏藏' + o.liuQin + o.zhi + o.wuxing))
        + '：' + (good.length ? good.join('、') : '无明显帮扶') + '；' + (bad.length ? bad.join('、') : '无明显伤损')
        + (o.where === '伏藏' ? '；伏藏待出' : '') + '。';
      return { verdict: verdict, reason: reason };
    }
    // v0.3 代占人位映射：subject -> 人位角色 spec
    function personSpecOf(subj, gender) {
      switch (subj) {
        case 'friend': return { role: '人位', liuQin: '兄弟' };
        case 'parent': return { role: '人位', liuQin: '父母' };
        case 'child': return { role: '人位', liuQin: '子孙' };
        case 'partner':
          if (gender === 'female') return { role: '人位', liuQin: '官鬼' };
          if (gender === 'male') return { role: '人位', liuQin: '妻财' };
          return { role: '人位', ref: '应爻', note: 'partner 未给性别取应爻' };
      }
      return null;
    }
    function collectForSpec(s) {
      var list = [];
      if (s.liuQin) {
        yaosDetail.forEach(function (d) { if (d.liuQin === s.liuQin) list.push(yaoOccurrence(s.role, d)); });
        hiddenSpirits.forEach(function (h) { if (h.liuQin === s.liuQin) list.push(hiddenOccurrence(s.role, h)); });
      } else if (s.ref === '世爻') list.push(yaoOccurrence(s.role, yaosDetail[worldPos - 1]));
      else if (s.ref === '应爻') list.push(yaoOccurrence(s.role, yaosDetail[responsePos - 1]));
      return list;
    }
    function sameOcc(a, b) {
      return a && b && a.where === b.where && a.zhi === b.zhi && a.position === b.position && a.underPosition === b.underPosition;
    }
    function pickPrimary(cands) {
      var best = null, bk = null;
      cands.forEach(function (o) {
        var k = occKey(o);
        if (!best || keyGt(k, bk)) { best = o; bk = k; }
      });
      return best;
    }
    var yongshen = null;
    if (opts.question_type !== undefined && opts.question_type !== null) {
      if (QT_KEYS.indexOf(opts.question_type) < 0) throw new Error('question_type must be one of: ' + QT_KEYS.join(' '));
      if (opts.gender !== undefined && opts.gender !== null && opts.gender !== 'male' && opts.gender !== 'female') throw new Error("gender must be 'male' or 'female'");
      var specs = roleSpecs(opts.question_type, opts.gender || null);
      // v0.3 代占：proxy_self 先立人位；代问病（recovery）以人位为用神，官鬼=病、子孙=医药照旧
      var pSpec = asker === 'proxy_self' ? personSpecOf(subject, opts.gender || null) : null;
      var personYao = null;
      if (pSpec) {
        personYao = pickPrimary(collectForSpec(pSpec));
        if (pSpec.note) personYao = Object.assign({}, personYao, { note: pSpec.note });
      }
      if (pSpec && opts.question_type === 'recovery') {
        specs = [pSpec, { role: '病', liuQin: '官鬼' }, { role: '医药', liuQin: '子孙' }];
      }
      var perSpec = specs.map(collectForSpec);
      var primary = pickPrimary(perSpec[0]);
      var secondary = perSpec.length > 1 ? pickPrimary(perSpec[1]) : null;
      var primaryReason = perSpec[0].length <= 1
        ? '用神仅此一处，取用'
        : '多处比主次（明>伏、动>静、旺>衰、不空不破），取' + (primary.where === '明现' ? primary.position + '爻' : '伏于' + primary.underPosition + '爻下') + primary.liuQin + primary.zhi + primary.wuxing;
      var relations = relationsFor(primary);
      if (secondary) relations = relations.concat(relationsFor(secondary));
      // 事之用神对人位爻的生克（我=人位）：生/克/比和/我生/我克
      var subjectRelation = null;
      if (personYao) {
        if (sameOcc(primary, personYao)) {
          subjectRelation = { type: '比和', note: '事之用神即人位（代问病以人位为用神）' };
        } else {
          var yw = BRANCH_WUXING[primary.zhi], pw2 = BRANCH_WUXING[personYao.zhi];
          var yz = primary.liuQin + primary.zhi + yw, pz = personYao.liuQin + personYao.zhi + pw2;
          if (yw === pw2) subjectRelation = { type: '比和', note: '用神' + yz + '与人位' + pz + '比和' };
          else if (SHENG[yw] === pw2) subjectRelation = { type: '生', note: '用神' + yz + '生人位' + pz + '（事来就人）' };
          else if (KE[yw] === pw2) subjectRelation = { type: '克', note: '用神' + yz + '克人位' + pz + '（事来克人）' };
          else if (SHENG[pw2] === yw) subjectRelation = { type: '我生', note: '人位' + pz + '生用神' + yz + '（人去就事）' };
          else subjectRelation = { type: '我克', note: '人位' + pz + '克用神' + yz + '（人能制事）' };
        }
      }
      var judgment = judgeOccurrence(primary);
      // proxy_self：人位空破受克压一档；人位即主用神（代问病）时已计入评分，不重复压
      if (personYao && !sameOcc(primary, personYao)) {
        var personBad = personYao.isVoid || personYao.isMonthBreak
          || relationOf(monthBranch, personYao.zhi) === '克' || relationOf(dayBranch, personYao.zhi) === '克';
        if (personBad) {
          judgment = {
            verdict: judgment.verdict === '成' ? '悬' : '不成',
            reason: judgment.reason + '人位' + personYao.liuQin + personYao.zhi + personYao.wuxing + '空破受克，压一档。'
          };
        }
      }
      yongshen = {
        questionType: opts.question_type,
        asker: asker,
        roles: specs.map(function (s) { return s.ref ? { role: s.role, ref: s.ref } : { role: s.role, liuQin: s.liuQin }; }),
        occurrences: [].concat.apply([], perSpec),
        primary: Object.assign({}, primary, { reason: primaryReason }),
        personYao: personYao,
        subjectRelation: subjectRelation,
        relations: relations,
        judgment: judgment
      };
      if (subject) yongshen.subject = subject;
    }

    // ======================== v0.3 增量 2：共用契约 timing ========================
    // 取用顺序：主用神 -> 其余同角色同六亲的用神落点（主次键序），第一个有应期候选的落点出窗口
    // （主用神静旺无伤无动而另现用神带空破/动时，应期落在另现用神上，note 留痕）。
    // 排名键=各候选最近支日（timingReal.days[0]），日候选优先于月候选；
    // 同日多机制合并进 mostLikely.source.mechanism（'＋'连接）。
    // secondary=下一个不同机制的候选，没有=null。全链无候选 → mostLikely=null + note。
    function windowOf(dateStr) {
      var y = +dateStr.slice(0, 4), m = +dateStr.slice(5, 7), d = +dateStr.slice(8, 10);
      return y + '年' + m + '月' + (d <= 10 ? '上旬' : d <= 20 ? '中旬' : '下旬');
    }
    function candsOfOcc(o) {
      if (o.where === '明现') return yaosDetail[o.position - 1].timingCandidates;
      for (var hi = 0; hi < hiddenSpirits.length; hi++) {
        if (hiddenSpirits[hi].liuQin === o.liuQin && hiddenSpirits[hi].underYaoPosition === o.underPosition) return hiddenSpirits[hi].timingCandidates;
      }
      return [];
    }
    function buildTiming(ys) {
      if (!ys || !ys.primary) return { mostLikely: null, secondary: null, note: '未指定 question_type，无主用神可推应期' };
      var p = ys.primary;
      var chain = [p];
      ys.occurrences.forEach(function (o) {
        if (o.role === p.role && o.liuQin === p.liuQin && !sameOcc(o, p)) chain.push(o);
      });
      var used = null, cands = [];
      for (var ci = 0; ci < chain.length; ci++) {
        var cc = candsOfOcc(chain[ci]);
        if (cc.length) { used = chain[ci]; cands = cc; break; }
      }
      if (!used) return { mostLikely: null, secondary: null, note: '用神无待解之结，无明确应期' };
      function day0(c) { return c.timingReal.days[0].slice(0, 10); }
      var sorted = cands.slice().sort(function (a, b) { return day0(a) < day0(b) ? -1 : day0(a) > day0(b) ? 1 : 0; });
      var srcBase = used.where === '明现' ? { position: used.position } : { underPosition: used.underPosition };
      srcBase.liuQin = used.liuQin; srcBase.zhi = used.zhi; srcBase.where = used.where;
      var d0 = day0(sorted[0]);
      var mechs = [], trig = sorted[0].triggerBranch;
      sorted.forEach(function (c) { if (day0(c) === d0 && mechs.indexOf(c.mechanism) < 0) mechs.push(c.mechanism); });
      var mostLikely = {
        start: d0,
        window: windowOf(d0),
        source: Object.assign({ mechanism: mechs.join('＋'), triggerBranch: trig }, srcBase)
      };
      var secondary = null;
      for (var si = 1; si < sorted.length; si++) {
        if (day0(sorted[si]) !== d0 && mechs.indexOf(sorted[si].mechanism) < 0) {
          var d1 = day0(sorted[si]);
          secondary = {
            start: d1,
            window: windowOf(d1),
            source: Object.assign({ mechanism: sorted[si].mechanism, triggerBranch: sorted[si].triggerBranch }, srcBase)
          };
          break;
        }
      }
      var out = { mostLikely: mostLikely, secondary: secondary };
      if (!sameOcc(used, p)) out.note = '主用神静旺无伤无动，取另现用神（' + (used.where === '明现' ? used.position + '爻' : '伏于' + used.underPosition + '爻下') + used.liuQin + used.zhi + '）之应期';
      return out;
    }
    var timing = buildTiming(yongshen);

    return {
      input: inputInfo,
      ganzhi: { year: gz.year, month: gz.month, day: gz.day, hour: gz.hour },
      lunar: { year: lunar.year, month: lunar.month, day: lunar.day, isLeapMonth: lunar.isLeap },
      original: { name: originalName, lines: lines },
      changed: changedName ? { name: changedName, lines: changedLines } : null,
      mutual: { name: mutualName },
      palace: { name: palaceName, wuxing: palaceWx },
      palaceStage: STAGE_NAMES[stage],
      worldAndResponse: (function () {
        var arr = ['', '', '', '', '', ''];
        arr[worldPos - 1] = '世';
        arr[responsePos - 1] = '应';
        return arr;
      })(),
      yaos: yaosDetail,
      voidBranches: voids,
      hiddenSpirits: hiddenSpirits,
      hexagramRelations: { isLiuHe: isLiuHe, isLiuChong: isLiuChong, transition: transition },
      fanfu: { fanyin: fanyin, fuyin: fuyin },
      timingSummary: timingSummary,
      sanXing: sanXing,
      sanHe: sanHe,
      guaShen: guaShen,
      yongshen: yongshen,
      timing: timing,
      warnings: warnings
    };
  }

  // ======================== 起卦入口 ========================
  // v0.2 增量 3：时间入参钉死当地钟点。
  // 所有入口必须显式传 year/month/day/hour（minute 缺省 0）；
  // 缺时间字段直接抛错，除非显式传 useMachineTime:true 并附 timezone 说明字段
  // （服务器上绝不允许静默用机器时间）。
  function resolveDt(args) {
    var hasAll = args && typeof args.year === 'number' && typeof args.month === 'number'
      && typeof args.day === 'number' && typeof args.hour === 'number';
    if (hasAll) return { year: args.year, month: args.month, day: args.day, hour: args.hour, minute: args.minute || 0 };
    if (args && args.useMachineTime === true) {
      if (typeof args.timezone !== 'string' || !args.timezone) {
        throw new Error('useMachineTime:true 必须附 timezone 说明字段（起卦人当地时区，如 Asia/Shanghai）');
      }
      var now = new Date();
      return {
        year: typeof args.year === 'number' ? args.year : now.getFullYear(),
        month: typeof args.month === 'number' ? args.month : now.getMonth() + 1,
        day: typeof args.day === 'number' ? args.day : now.getDate(),
        hour: typeof args.hour === 'number' ? args.hour : now.getHours(),
        minute: typeof args.minute === 'number' ? args.minute : now.getMinutes()
      };
    }
    throw new Error('必须显式传起卦时刻（year/month/day/hour，提问人当地钟点）；确需机器时间须显式传 useMachineTime:true 并附 timezone 字段');
  }

  function extraInput(args) {
    var o = {};
    if (args.question_type !== undefined) o.question_type = args.question_type;
    if (args.gender !== undefined) o.gender = args.gender;
    if (args.asker !== undefined) o.asker = args.asker;
    if (args.subject !== undefined) o.subject = args.subject;
    if (args.useMachineTime === true) { o.useMachineTime = true; o.timezone = args.timezone; }
    return o;
  }

  // 梅花时间起卦（收提问人当地钟点）
  function castByTime(args) {
    var dt = resolveDt(args);
    var lunar = toLunar(dt.year, dt.month, dt.day);
    var gz = ganzhiOf(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt);
    var yearBranchNum = gz._yearBranchIdx + 1;   // 子1 丑2 ... 亥12
    var hourBranchNum = (((dt.hour + 1) % 24) / 2 | 0) + 1;
    var S1 = yearBranchNum + lunar.month + lunar.day;
    var S2 = S1 + hourBranchNum;
    var up = modTrigram(S1);
    var lo = modTrigram(S2);
    var move = S2 % 6 === 0 ? 6 : S2 % 6;
    var lines = TRIGRAM_LINES[trigramByNumber(lo)].concat(TRIGRAM_LINES[trigramByNumber(up)]);
    var yaos = lines.map(function (ln, i) {
      if (i + 1 === move) return ln === 1 ? 9 : 6;
      return ln === 1 ? 7 : 8;
    });
    return buildChart(yaos, dt, Object.assign({ method: 'time', year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, lateZiSwitch: args.lateZiSwitch !== false }, extraInput(args)));
  }

  // 三数起卦：上卦=a mod 8、下卦=b mod 8、动爻=c mod 6（余 0 取 8/6）
  // 起卦时刻必填（year/month/day/hour）；缺省抛错，除非 useMachineTime:true + timezone。
  function castByNumbers(args) {
    var nums = args.numbers;
    if (!Array.isArray(nums) || nums.length !== 3) throw new Error('numbers must be [a,b,c]');
    var dt = resolveDt(args);
    var up = modTrigram(nums[0]);
    var lo = modTrigram(nums[1]);
    var move = nums[2] % 6 === 0 ? 6 : nums[2] % 6;
    var lines = TRIGRAM_LINES[trigramByNumber(lo)].concat(TRIGRAM_LINES[trigramByNumber(up)]);
    var yaos = lines.map(function (ln, i) {
      if (i + 1 === move) return ln === 1 ? 9 : 6;
      return ln === 1 ? 7 : 8;
    });
    return buildChart(yaos, dt, Object.assign({ method: 'numbers', numbers: nums.slice(), lateZiSwitch: args.lateZiSwitch !== false }, extraInput(args)));
  }

  // 手填爻值（6 老阴动 / 7 少阳 / 8 少阴 / 9 老阳动，初爻在前）
  function castManual(args) {
    var dt = resolveDt(args);
    return buildChart(args.yaos.slice(), dt, Object.assign({ method: 'manual', yaos: args.yaos.slice(), lateZiSwitch: args.lateZiSwitch !== false }, extraInput(args)));
  }

  // 三钱法：throws = [[2|3,2|3,2|3] x 6]，初爻在前
  function castCoins(args) {
    var dt = resolveDt(args);
    var throwsArr = args.throws;
    if (!Array.isArray(throwsArr) || throwsArr.length !== 6) throw new Error('throws must be 6 triples');
    var yaos = throwsArr.map(function (t) {
      if (!Array.isArray(t) || t.length !== 3) throw new Error('each throw must be [c,c,c]');
      var sum = t.reduce(function (a, b) {
        if (b !== 2 && b !== 3) throw new Error('coin must be 2 or 3');
        return a + b;
      }, 0);
      return sum; // 6/7/8/9
    });
    return buildChart(yaos, dt, Object.assign({ method: 'coins', throws: throwsArr, lateZiSwitch: args.lateZiSwitch !== false }, extraInput(args)));
  }

  return {
    castByTime: castByTime,
    castByNumbers: castByNumbers,
    castManual: castManual,
    castCoins: castCoins,
    // 内部工具（台架调试用）
    _internal: {
      ganzhiOf: ganzhiOf,
      toLunar: toLunar,
      jdn: jdn,
      dayPillarIndex: dayPillarIndex,
      PALACE_MAP: PALACE_MAP,
      HEX_NAMES: HEX_NAMES
    }
  };
}));
