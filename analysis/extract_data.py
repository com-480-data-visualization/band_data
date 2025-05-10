import pandas as pd
import numpy as np
from pandas.api.types import CategoricalDtype



DATA_DIR = '../data'
ALL_MATCHES_ATP = DATA_DIR + '/all_matches_atp.csv'
ALL_MATCHES_WTA = DATA_DIR + '/all_matches_wta.csv'
ATP_PLAYERS = DATA_DIR + '/atp_players.csv'
WTA_PLAYERS = DATA_DIR + '/wta_players.csv'

def match_breakdown_surface_tourney(df, threshold=3):
    """
    Return df used for sunburst diagram in player profile
    :param df: matches df with each row = 1 match
    :param threshold: threshold of min # matches to keep a given surface-tourney level-tourney name combo
    :return: number of matches per player, surface, tournament level, and tournament name
    """
    count_sunburst = df.groupby(
        ['winner_name', 'surface', 'tourney_level', 'tourney_name']).size().reset_index(name='count')
    count_sunburst.loc[count_sunburst['count'] <=threshold, 'tourney_name'] = 'Other'
    return count_sunburst.groupby(['winner_name', 'surface', 'tourney_level', 'tourney_name']).sum('count').reset_index()

def compute_player_stats(row):
    row['ace_pct'] = row['w_ace'] / row['w_svpt'] * 100 if row['w_svpt'] > 0 else np.nan
    row['1stIn_pct'] = row['w_1stIn'] / row['w_svpt'] * 100 if row['w_svpt'] > 0 else np.nan
    row['1stWon_pct'] = row['w_1stWon'] / row['w_1stIn'] * 100 if row['w_1stIn'] > 0 else np.nan
    row['2ndWon_pct'] = row['w_2ndWon'] / (row['w_svpt'] - row['w_1stIn'] - row['w_df']) * 100 if (row['w_svpt'] - row[
        'w_1stIn'] - row['w_df']) > 0 else np.nan
    row['df_pct'] = row['w_df'] / row['w_svpt'] * 100 if row['w_svpt'] > 0 else np.nan
    row['bpSaved_pct'] = row['w_bpSaved'] / row['w_bpFaced'] * 100 if row['w_bpFaced'] > 0 else np.nan
    return row

def compute_all_stats(df, groupSurface=True):
    df = df.apply(compute_player_stats, axis=1)
    if groupSurface:
     return df.groupby(['winner_name', 'surface'])[
        ["ace_pct", '1stIn_pct', '1stWon_pct', '2ndWon_pct', 'df_pct', 'bpSaved_pct']].mean().reset_index()
    return df.groupby(['winner_name'])[
        ["ace_pct", '1stIn_pct', '1stWon_pct', '2ndWon_pct', 'df_pct', 'bpSaved_pct']].mean().reset_index()

#TODO: update to consider only winners & only losers
def player_profile(df, tourney_levels):
    total_matches = pd.merge(df.groupby('winner_name').size().reset_index(name='matches_won'),
                             df.groupby('loser_name').size().reset_index(name='matches_lost'),
                             left_on='winner_name',
                             right_on='loser_name',
                             how='inner').drop(labels=['loser_name'], axis=1)
    total_matches['total'] = total_matches['matches_won'] + total_matches['matches_lost']

    player_data = pd.merge(total_matches, df.groupby('winner_name').agg(
        career_start=('tourney_year', 'min'),
        career_end=('tourney_year', 'max'),
        hand=('winner_hand', 'min'),
        height=('winner_ht', 'max')
    ), on='winner_name')
    player_data = pd.merge(
        player_data,
        (df[df['round'] == 'F'].groupby(['winner_name', 'tourney_level']).size().reset_index(name='count').
         pivot(columns='tourney_level', values='count', index='winner_name').reset_index()),
        on='winner_name', how='left')
    tourney_levels = [col for col in tourney_levels if col in player_data.columns]
    player_data[tourney_levels] = player_data[tourney_levels].fillna(0)
    player_data = player_data.rename(
        columns={c: c+'_titles' for c in tourney_levels})
    return player_data

def player_performance(df):
    round_order = ['RR', 'BR', 'ER', 'R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F']
    round_dtype = CategoricalDtype(categories=round_order, ordered=True)

    df['round'] = df['round'].astype(round_dtype)

    rounds = df.groupby(['winner_name', 'tourney_year', 'tourney_level', 'tourney_name'])[
        'round'].max().reset_index()
    rounds = rounds.groupby(['winner_name', 'tourney_year', 'tourney_level', 'round'],
                            observed=True).size().reset_index(name='match_count')
    max_rank_points = df.groupby(['winner_name', 'tourney_year']).agg(
        best_rank=('winner_rank', 'min')).reset_index()
    player_perf = pd.merge(rounds, max_rank_points, on=['winner_name', 'tourney_year'])
    player_perf['titles'] = player_perf.apply(lambda x: 0 if x['round'] != 'F' else x['match_count'], axis=1)
    return player_perf

def load_match_df(path):
    df = pd.read_csv(path)
    df = pd.DataFrame(df)
    df.drop(df.columns[0], axis=1, inplace=True)
    df['tourney_date'] = pd.to_datetime(df['tourney_date'], format='%Y%m%d')
    df['tourney_year'] = df.tourney_date.dt.year
    return df, df['tourney_level'].unique().tolist()

def main():
    df_atp, atp_tourney_levels = load_match_df(ALL_MATCHES_ATP)
    df_wta, wta_tourney_levels = load_match_df(ALL_MATCHES_WTA)

    compute_all_stats(df_atp).to_csv(DATA_DIR + '/atp_player_stats.csv', index=False)
    player_profile(df_atp, atp_tourney_levels).to_csv(DATA_DIR + '/atp_player_profile.csv', index=False)
    player_performance(df_atp).to_csv(DATA_DIR + '/atp_player_perf.csv', index=False)
    match_breakdown_surface_tourney(df_atp).to_csv(DATA_DIR + '/atp_prop_surface_sunburst.csv', index=False)

    compute_all_stats(df_wta).to_csv(DATA_DIR + '/wta_player_stats.csv', index=False)
    player_profile(df_wta, wta_tourney_levels).to_csv(DATA_DIR + '/wta_player_profile.csv', index=False)
    player_performance(df_wta).to_csv(DATA_DIR + '/wta_player_perf.csv', index=False)
    match_breakdown_surface_tourney(df_wta).to_csv(DATA_DIR + '/wta_prop_surface_sunburst.csv', index=False)


if __name__ == '__main__':
    main()