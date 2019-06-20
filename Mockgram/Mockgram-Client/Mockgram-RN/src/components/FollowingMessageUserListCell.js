import React from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { connect } from "react-redux";
import ActionSheet from "react-native-actionsheet";
import { withNavigation } from "react-navigation";
import { Ionicons } from "@expo/vector-icons";

import Button from "./Button";
import Thumbnail from "./Thumbnail";

import baseUrl from "../common/baseUrl";
import window from "../utils/getDeviceInfo";
import theme from "../common/theme";

class FollowingMessasgeUserListCell extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      dataSource: this.props.dataSource
    };
  }

  showActionSheet = () => {
    this.ActionSheet.show();
  };

  followAction = type => {
    const { client, navigation } = this.props;
    const { dataSource } = this.state;
    if (client && client.token) {
      this.setState(
        {
          loading: true
        },
        () => {
          return fetch(`${baseUrl.api}/user/follow`, {
            method: "PUT",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: client.token
            },
            body: JSON.stringify({
              followingId: dataSource._id,
              type: type
            })
          })
            .then(res => res.json())
            .then(resJson => {
              this.setState(
                {
                  loading: false
                },
                () => {
                  console.log(resJson);
                  if (resJson.status === 200) {
                    dataSource.followed = !dataSource.followed;
                    this.setState({
                      dataSource: dataSource
                    });
                  }
                }
              );
            })
            .catch(err => {
              this.setState({
                loading: false
              });
              console.log(err);
            });
        }
      );
    } else {
      navigation.navigate("Auth");
    }
  };

  renderButton = () => {
    const { client, i18n } = this.props;
    const { dataSource } = this.state;
    if (client && client.user._id === dataSource._id) {
      return null;
    }
    let followStyle = {
      width: Math.floor(window.width * 0.25),
      height: Math.floor(window.height * 0.04),
      backgroundColor: theme.primaryColor
    };
    let followingStyle = {
      width: Math.floor(window.width * 0.25),
      height: Math.floor(window.height * 0.04),
      backgroundColor: "lightgrey",
      borderColor: "black"
    };
    return (
      <Button
        containerStyle={dataSource.followed ? followingStyle : followStyle}
        loading={this.state.loading}
        titleStyle={{ fontSize: 14, color: "#fff" }}
        iconRight={() => {
          if (dataSource.followed) {
            return <Ionicons name="md-checkmark" color="#fff" size={18} />;
          }
          return null;
        }}
        title={
          dataSource.followed ? `${i18n.t("FOLLOWING")}` : `${i18n.t("FOLLOW")}`
        }
        onPress={() => {
          dataSource.followed
            ? this.showActionSheet()
            : this.followAction("Follow");
        }}
      />
    );
  };
  renderRecentMessage = message => {
    const { i18n } = this.props;
    if (message) {
      let messageType = message.messageType;
      switch (messageType) {
        case "LikePost":
          return `${i18n.t("LIKE_POST")}${message.postReference.description}`;
        case "LikeComment":
          return `${i18n.t("LIKE_COMMENT")}${message.commentReference.content}`;
        case "LikeReply":
          return `${i18n.t("LIKE_REPLY")}${message.replyReference.content}`;
        case "CommentPost":
          return `${i18n.t("COMMENT_POST")}${
            message.postReference.description
          }`;
        case "ReplyReply":
        case "ReplyComment":
          return `${i18n.t("REPLY_COMMENT")}${
            message.commentReference.content
          }`;
        case "Follow":
          return `${i18n.t("FOLLOW_ACTION")}${message.receiver.username}`;
        default:
          return null;
      }
    }
    return null;
  };

  render() {
    const { dataSource, navigation, i18n } = this.props;
    return (
      <View style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            navigation.push("FollowingMessageDetail", {
              userId: dataSource._id,
              username: dataSource.username
            });
          }}
          style={{
            flex: 3,
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center"
          }}
        >
          <View
            style={{
              width: "20%",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <Thumbnail
              source={dataSource.avatar}
              style={{ width: 40, height: 40 }}
            />
          </View>
          <View
            style={{
              width: "80%",
              justifyContent: "center",
              alignItems: "flex-start"
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "bold" }}>
              {dataSource.username}
            </Text>
            <Text ellipsizeMode="tail" numberOfLines={1}>
              {dataSource.bio}
            </Text>
            <Text
              style={{ color: "grey", fontSize: 12 }}
              ellipsizeMode="tail"
              numberOfLines={1}
            >
              {this.renderRecentMessage(dataSource.recentMessage)}
            </Text>
          </View>
        </TouchableOpacity>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginRight: theme.paddingToWindow
          }}
        >
          {this.renderButton()}
        </View>
        <ActionSheet
          ref={o => (this.ActionSheet = o)}
          title={`${i18n.t("UNFOLLOW_TITLE")}`}
          message={`${i18n.t("UNFOLLOW_INFO")}`}
          options={[`${i18n.t("CONFIRM")}`, `${i18n.t("CANCEL")}`]}
          cancelButtonIndex={1}
          onPress={index => {
            if (index === 0) {
              //unfollow user
              this.followAction("Unfollow");
            }
          }}
        />
      </View>
    );
  }
}

const mapStateToProps = state => ({
  client: state.client.client,
  i18n: state.app.i18n
});

export default connect(
  mapStateToProps,
  null
)(withNavigation(FollowingMessasgeUserListCell));

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: Math.floor(window.height * 0.15),
    justifyContent: "flex-start",
    alignItems: "center",
    flexDirection: "row"
  }
});
