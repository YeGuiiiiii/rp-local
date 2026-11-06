(function () {
    'use strict';
    const officialGroup = 'STA1N官方分组';
    const defaultGroup = '默认分组';
    const type = 'rp-hub-preset-groups';
    const groupName = value => String(value || '').trim();
    const groupOf = preset => groupName(preset.group || preset.presetGroup || preset.category) || officialGroup;
    const names = (presets, savedNames = []) => [...new Set([
        officialGroup, ...savedNames.map(groupName).filter(Boolean), ...presets.map(groupOf)
    ])];
    const checkPresets = items => {
        if (!Array.isArray(items) || items.some(item => !item || typeof item !== 'object'
            || Array.isArray(item) || typeof item.content !== 'string'
            || (item.name !== undefined && typeof item.name !== 'string'))) {
            throw new Error('未找到有效预设，请选择预设 JSON 或本软件导出的分组文件');
        }
        return items;
    };
    const readImport = (data, targetGroup = '') => {
        const target = groupName(targetGroup);
        if (data?.type === type) {
            if (data.version !== 1 || !Array.isArray(data.groups) || !data.groups.length) {
                throw new Error('分组文件格式或版本不受支持');
            }
            return data.groups.map(group => {
                if (!group || typeof group.name !== 'string' || !groupName(group.name)) {
                    throw new Error('分组文件缺少分组名称');
                }
                return { name: target || groupName(group.name), presets: checkPresets(group.presets) };
            });
        }
        const items = checkPresets(Array.isArray(data) ? data : [data]);
        if (!items.length) throw new Error('文件中没有预设');
        return [{ name: target || defaultGroup, presets: items }];
    };
    const exportGroups = (presets, groupNames) => ({
        type, version: 1,
        groups: groupNames.map(name => ({
            name, presets: presets.filter(preset => groupOf(preset) === name)
        }))
    });
    window.RPPresetLibrary = Object.freeze({ officialGroup, defaultGroup, groupName, groupOf, names, readImport, exportGroups });
})();
