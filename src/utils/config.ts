export const config = {
    clinicName: "Pinnacle Family Clinic",
    copyRight: "Copyright © 2024 Pinnacle Family Clinic Pte. Ltd. All Rights Reserved",
    version: "Version 1.0"
}

export const colorConfig = {
    sidebarBackgroundColor: "#15405F",
    sidebarActiveButtonColor: "#0874BD"
}

export const antdCustomizeTheme = {
    token: {
        colorPrimary: "#15405F"
    },
    components: {
        Layout: {
            siderBg: colorConfig.sidebarBackgroundColor
        },
        Menu: {
            itemBg: colorConfig.sidebarActiveButtonColor,
            darkItemBg: colorConfig.sidebarBackgroundColor,
            darkItemHoverBg: colorConfig.sidebarActiveButtonColor,
            darkItemSelectedBg: colorConfig.sidebarActiveButtonColor,
        }
    }
}

