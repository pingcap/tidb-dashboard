import {
  Box,
  BoxProps,
  Drawer,
  DrawerProps,
  Group,
  GroupProps,
} from "@tidbcloud/uikit"

export const ActionDrawer = (props: DrawerProps) => {
  return (
    <Drawer
      position="right"
      size="30rem"
      styles={(theme) => ({
        content: {
          display: "flex",
          flexDirection: "column",
          transitionProperty: "flex-basis, transform, opacity !important",
        },
        header: {
          paddingLeft: 24,
          backgroundColor: theme.colors.carbon[0],
          borderBottom: `1px solid ${theme.colors.carbon[4]}`,
        },
        title: {
          fontWeight: 700,
          fontSize: 16,
          lineHeight: 1.5,
          color: theme.colors.carbon[9],
        },
        body: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflowY: "hidden",
        },
      })}
      {...props}
    />
  )
}

const ActionDrawerBody = (props: React.PropsWithChildren<BoxProps>) => {
  return <Box sx={{ flex: 1, padding: 24, overflowY: "auto" }} {...props} />
}

const ActionDrawerFooter = (props: GroupProps) => {
  return (
    <Group
      justify="flex-end"
      px={24}
      py="md"
      sx={(theme) => ({
        borderTop: `1px solid ${theme.colors.carbon[4]}`,
        backgroundColor: theme.colors.carbon[0],
        position: "sticky",
        bottom: 0,
      })}
      {...props}
    />
  )
}

ActionDrawer.Body = ActionDrawerBody
ActionDrawer.Footer = ActionDrawerFooter
