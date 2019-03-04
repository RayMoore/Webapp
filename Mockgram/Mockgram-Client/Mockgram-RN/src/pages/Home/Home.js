import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SkypeIndicator } from 'react-native-indicators'
import { connect } from 'react-redux';
import { Header } from 'react-navigation';

import PostCardComponent from '../../components/PostCardComponent';
import baseUrl from '../../common/baseUrl';
import config from '../../common/config';
import window from '../../utils/getDeviceInfo';
import { parseIdFromObjectArray } from '../../utils/idParser';

class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            error: null,
            hasMore: true,
            loading: false,
            refreshing: false,
            loadingMore: false,
            fetching: false,
            interrupt: false
        };
    }

    static navigationOptions = ({ navigation }) => {
        return {
            title: 'Mockgram',
            headerStyle: {
                backgroundColor: 'white'
            },
            headerTitleStyle: {
                color: 'black',
                fontSize: 20
            }
        }
    }

    componentDidUpdate(prevProps) {
        const { client, initialized } = this.props;
        if (!prevProps.initialized && initialized) {
            // app initialized for the first time
            this.setState({
                loading: true,
                refreshing: false,
                loadingMore: false
            }, () => {
                console.log('loading');
                this.fetchPosts();
            })

        } else {
            // app uninitialized or from initialized to uninitialized
            if (initialized && client !== prevProps.client) {
                this.handleReload();
            }
        }
    }

    fetchPosts = () => {
        /**
         * status is one of refreshing, loading and lodingMore
         * use status to check if the network request is interrupted
         * the criteria is the value of status has been changed after receving server response 
         * */

        const url = `${baseUrl.api}/post`;
        const { client } = this.props;
        this.setState({
            fetching: true
        }, () => {
            console.log(`fetching data from ${url}`);
            fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    limit: config.postReturnLimit,
                    userId: client ? client.user._id : null,
                    lastQueryDataIds: (this.state.loading || this.state.refreshing) ? [] : parseIdFromObjectArray(this.state.data)
                })
            }).then(res => res.json()).then(res => {
                if (!this.state.interrupt) {
                    this.setState({
                        data: (this.state.loading || this.state.refreshing) ? res.data : this.state.data.concat(...res.data),
                        error: res.status === 200 ? null : res.msg,
                        hasMore: res.data.length < config.postReturnLimit ? false : true,
                    })
                } else {
                    this.setState({
                        interrupt: false
                    })
                }
            }).then(() => {
                this.setState({
                    loading: false,
                    refreshing: false,
                    loadingMore: false,
                    fetching: false
                })
            }).catch(error => {
                this.setState({
                    error: "Network request failed",
                    loading: false,
                    refreshing: false,
                    loadingMore: false,
                    fetching: false,
                    interrupt: false
                });
            });
        })
    };

    handleReload = () => {
        /**
         *  reload should have highest priority than loading more and refreshing
         *  do not need to check if page is requesting for loading more or refreshing
         *  interrupt other network requests by setting status to false
         */
        if (this.state.fetching) {
            this.setState({
                interrupt: true
            })
        }
        this.setState({
            loading: true,
            refreshing: false,
            loadingMore: false
        }, () => {
            console.log('reloading');
            this.fetchPosts()
        })
    }

    handleRefresh = () => {
        /**
         *  refresh should have higher priority than load more 
         *  if this page is refreshing or loading, disable refresh
         *  otherwise anable refresh
         *  */
        if (!this.state.refreshing && !this.state.loading) {
            if (this.state.fetching) {
                this.setState({
                    interrupt: true
                })
            }
            this.setState({
                refreshing: true,
                loading: false,
                loadingMore: false
            }, () => {
                console.log("refreshing");
                this.fetchPosts();
            })
        }
    };

    handleLoadMore = () => {
        // only loading more when request resource has more data and page is not loading, refreshing and loading more beforehand
        if (this.state.hasMore && !this.state.refreshing && !this.state.loading && !this.state.loadingMore && !this.state.fetching) {
            this.setState(
                {
                    loadingMore: true,
                    refreshing: false,
                    loding: false
                },
                () => {
                    console.log("loading more");
                    this.fetchPosts();
                }
            );
        }
    };

    renderFooter = () => {
        const { loading, loadingMore, refreshing, data, hasMore } = this.state;
        const { initialized } = this.props;
        if (initialized) {
            if (!loading && !loadingMore && !refreshing && data.length === 0) {
                return null;
            }
            return (
                <View style={styles.listFooter}>
                    {hasMore ? <SkypeIndicator size={25} /> : <Text style={{ color: 'grey', fontSize: 12 }}> - No more posts - </Text>}
                </View>
            );
        }
        return null;
    };

    listEmpty = () => {
        if (this.state.error) {
            return (
                <View style={styles.errorMsgView}>
                    <Text>{this.state.error}</Text>
                </View >
            );
        }
        return (
            <View style={styles.errorMsgView}>
                <Text style={{ color: 'grey' }}>- Temporarily no posts found -</Text>
            </View>
        );
    }

    renderPost = () => {
        const { initialized } = this.props;
        if (initialized) {
            if (this.state.loading) {
                return (
                    <View style={styles.errorMsgView}>
                        <SkypeIndicator />
                    </View>
                )
            } else {
                return (
                    <FlatList
                        style={{ marginTop: 0, width: '100%', backgroundColor: '#fff' }}
                        contentContainerStyle={{ backgroundColor: '#fff' }}
                        data={this.state.data}
                        renderItem={({ item }) => (
                            <PostCardComponent dataSource={item} />
                        )}
                        ListEmptyComponent={this.listEmpty}
                        keyExtractor={item => item._id}
                        onRefresh={this.handleRefresh}
                        refreshing={this.state.refreshing}
                        ListFooterComponent={this.renderFooter}
                        onEndReached={this.handleLoadMore}
                        onEndReachedThreshold={0.2}
                    />
                );
            }
        } else {
            return (
                <View style={styles.errorMsgView}>
                    <SkypeIndicator />
                </View>
            );
        }
    }

    render() {
        return (
            <View style={styles.contentContainer}>
                {this.renderPost()}
            </View>
        );
    }
}

const mapStateToProps = state => ({
    client: state.client.client,
    initialized: state.app.initialized
})

export default connect(mapStateToProps, null)(Home);

const styles = StyleSheet.create({
    contentContainer: {
        height: window.height - Header.HEIGHT,
        width: window.width,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderTopWidth: 0,
        borderBottomWidth: 0,
        marginTop: 0,
    },
    listFooter: {
        alignItems: 'center',
        justifyContent: 'center',
        height: window.height * 0.1
    },
    errorMsgView: {
        marginTop: -50,
        backgroundColor: '#fff',
        height: window.height - Header.HEIGHT,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    }
});