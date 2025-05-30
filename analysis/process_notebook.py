import pandas as pd
import numpy as np
from pandas.api.types import CategoricalDtype

men_matches = pd.read_csv('../data/all_matches_atp.csv')
men_matches = pd.DataFrame(men_matches)
men_matches.drop(men_matches.columns[0], axis=1, inplace=True)

women_matches = pd.read_csv('../data/all_matches_wta.csv')
women_matches = pd.DataFrame(women_matches)
women_matches.drop(women_matches.columns[0], axis=1, inplace=True)

atp_players = pd.read_csv('../data/tennis_atp/atp_players.csv')
atp_players['player_name'] = atp_players.apply(lambda row: str(row['name_first']) + " " + str(row['name_last']), axis=1)
wta_players = pd.read_csv('../data/tennis_wta/wta_players.csv')
wta_players['player_name'] = wta_players.apply(lambda row: str(row['name_first']) + " " + str(row['name_last']), axis=1)

def map_tourney_level_wta(tourney_level):
    if tourney_level == 'T1':
        return 'PM'
    elif tourney_level == 'T2':
        return 'P'
    else:
        return tourney_level

women_matches['tourney_level'] = women_matches['tourney_level'].map(map_tourney_level_wta)

def filter_matches(df):
    return df[df['tourney_level'].isin(['A', 'G', 'M', 'F', 'PM', 'P'])]
    

men_matches = filter_matches(men_matches)
women_matches = filter_matches(women_matches)

def get_decade(year):
    if str(year)[2] == '9':
        return '90s'
    elif str(year)[2] == '0':
        return '00s'
    elif str(year)[2] == '1':
        return '10s'
    elif str(year)[2] == '2':
        return '20s'
    else:
        return np.nan
    
def set_dates(df):
    df['tourney_date'] = pd.to_datetime(df['tourney_date'], format='%Y%m%d')
    df['tourney_year'] = df.tourney_date.dt.year
    df['decade'] = df['tourney_year'].apply(get_decade)
    return df 

men_matches = set_dates(men_matches)
women_matches = set_dates(women_matches)

def get_player_name(row):
    if row['winner_name'] is not np.nan:
        return row['winner_name']
    else:
        return row['loser_name']

def get_match_counts_player(df, conditions=None):
    if conditions is None:
        groupByList = []
    else:
        groupByList = conditions
    won = (df.groupby(['winner_id','winner_name'] + groupByList).size().reset_index(name='matches_won')
           .rename(columns={'winner_name': 'player_name', 'winner_id':'player_id'}))
    lost = (df.groupby(['loser_id','loser_name'] + groupByList).size().reset_index(name='matches_lost')
            .rename(columns={'loser_name': 'player_name', 'loser_id': 'player_id'}))
    total = (pd.merge(left=won, right=lost, how='outer', on=['player_id', 'player_name'] + groupByList)
                                   .fillna({'matches_won': 0, 'matches_lost': 0}))
    return total

def get_titles(df, tourney_levels):
    rename_dict = {x:x+'_titles' for x in tourney_levels}
    rename_dict['winner_name'] = 'player_name'
    rename_dict['winner_id'] = 'player_id'
    return df[df['round'] == 'F'].groupby(['winner_id','winner_name', 'tourney_level']).size().reset_index(name='count').pivot(columns='tourney_level', values='count', index=['winner_id', 'winner_name']).reset_index().fillna(0).rename(columns=rename_dict)

def get_career_years(df):
    return pd.concat(
        [
            df.groupby(['winner_id','winner_name']).agg(earliest=('tourney_year', 'min'), latest=('tourney_year', 'max')).reset_index().rename(columns={'winner_name': 'player_name', 'winner_id':'player_id'}),
            df.groupby(['loser_id','loser_name']).agg(earliest=('tourney_year', 'min'), latest=('tourney_year', 'max')).reset_index().rename(columns={'loser_name':'player_name', 'loser_id':'player_id'})
        ],
        axis=0 
    ).groupby(['player_id','player_name']).agg(career_start=('earliest', 'min'), career_end=('latest', 'max')).reset_index()

def get_player_profiles(match_df, player_df):
    match_counts = get_match_counts_player(match_df)
    match_counts['win_rate'] = match_counts['matches_won'] / (match_counts['matches_lost'] + match_counts['matches_won'])
    titles = get_titles(match_df, match_df.tourney_level.unique().tolist())
    career_years = get_career_years(match_df)
    player_data = player_df[['player_id', 'hand','dob','ioc','height']]
    return pd.merge(
        pd.merge(
            pd.merge(
                match_counts, 
                titles,
                on=['player_id', 'player_name'],
                how='left'
            ).fillna(0), 
            career_years,
            on=['player_id', 'player_name'],
        ),
        player_data,
        on='player_id'
    )



def get_avg_rank_player(match_df):
    player_matches = pd.concat(
                    [
                        match_df[['winner_id', 'winner_name', 'tourney_level', 'surface', 'decade', 'winner_rank']].rename(
                            columns={'winner_name': 'player_name', 'winner_rank': 'rank', 'winner_id':'player_id'}),
                         match_df[['loser_id', 'loser_name', 'tourney_level', 'surface', 'decade', 'loser_rank']].rename(
                             columns={'loser_name': 'player_name', 'loser_rank': 'rank', 'loser_id': 'player_id'})
                    ],
                    ignore_index=True
                )
    ranks_surf_tourney = player_matches.groupby(['player_id', 'player_name', 'tourney_level', 'surface', 'decade']).agg(avg_rank=('rank', 'min')).reset_index()
    ranks_surf = player_matches.groupby(['player_id', 'player_name', 'surface', 'decade']).agg(avg_rank=('rank', 'min')).reset_index()
    ranks_surf['tourney_level'] = 'All'
    ranks_tourney = player_matches.groupby(['player_id', 'player_name', 'tourney_level', 'decade']).agg(avg_rank=('rank', 'min')).reset_index()
    ranks_tourney['surface'] = 'All'
    ranks_all = player_matches.groupby(['player_id', 'player_name', 'decade']).agg(avg_rank=('rank', 'min')).reset_index()
    ranks_all['surface'] = 'All'
    ranks_all['tourney_level'] = 'All'
    
    return pd.concat(
        [
            ranks_surf_tourney[['player_id', 'player_name', 'decade', 'tourney_level', 'surface', 'avg_rank']],
            ranks_surf[['player_id', 'player_name', 'decade', 'tourney_level', 'surface', 'avg_rank']],
            ranks_tourney[['player_id', 'player_name', 'decade', 'tourney_level', 'surface', 'avg_rank']],
            ranks_all[['player_id', 'player_name', 'decade', 'tourney_level', 'surface', 'avg_rank']],
        ],
        axis = 0,
        ignore_index=True
    )

def compute_score(row):
    num_played = row['matches_won'] + row['matches_lost']
    score = np.log(num_played + 1)
    score *= row['win_rate']
    score *= 1 / (np.log(row['avg_rank'] + np.e))
    return score


def get_filter_player_data(match_df, player_df):
    match_counts = get_match_counts_player(match_df, ['tourney_level', 'surface', 'decade'])
    match_counts_all = get_match_counts_player(match_df, ['decade'])
    match_counts_all['surface'] = 'All'
    match_counts_all['tourney_level'] = 'All'
    match_counts_all_surfaces = get_match_counts_player(match_df, ['decade', 'tourney_level'])
    match_counts_all_surfaces['surface'] = 'All'
    match_counts_all_tourneys = get_match_counts_player(match_df, ['decade', 'surface'])
    match_counts_all_tourneys['tourney_level'] = 'All'
    match_counts = pd.concat(
        [
            match_counts[['player_id', 'player_name', 'tourney_level', 'surface','decade', 'matches_won', 'matches_lost']],
            match_counts_all[['player_id', 'player_name', 'tourney_level', 'surface','decade', 'matches_won', 'matches_lost']], 
            match_counts_all_tourneys[['player_id', 'player_name', 'tourney_level', 'surface','decade', 'matches_won', 'matches_lost']],
            match_counts_all_surfaces[['player_id', 'player_name', 'tourney_level', 'surface','decade', 'matches_won', 'matches_lost']]
        ],
        axis=0,
        ignore_index=True
    )
    match_counts['win_rate'] = match_counts['matches_won'] / (match_counts['matches_lost'] + match_counts['matches_won'])
    player_data = pd.merge(match_counts, player_df[['player_id', 'player_name','hand','ioc']], on=['player_id', 'player_name'])
    avg_rank = get_avg_rank_player(match_df)
    player_data = pd.merge(player_data, avg_rank, on=['player_id','player_name', 'tourney_level', 'surface', 'decade'], how='left')
    player_data['score'] = player_data.apply(compute_score, axis=1)
    player_data.dropna(subset=['score'], inplace=True)
    return player_data

def get_unique_players(men_matches, atp_players,women_matches,wta_players):
    unique_atp_players = get_filter_player_data(men_matches,atp_players)[['player_id', 'player_name']].drop_duplicates()
    unique_atp_players['association'] = 'atp'
    unique_wta_players = get_filter_player_data(women_matches,wta_players)[['player_id', 'player_name']].drop_duplicates()
    unique_wta_players['association'] = 'wta'
    unique_players = pd.concat(
        [unique_atp_players, unique_wta_players],
        axis=0,
        ignore_index=True
    )
    unique_players.sort_values(by='player_name', inplace=True)
    return unique_players

def surface_win_rates(match_df):
    match_counts = get_match_counts_player(match_df, ['surface'])
    match_counts['win_rate'] = match_counts.apply(lambda row: row['matches_won'] / (row['matches_won'] + row['matches_lost']) * 100, axis=1)
    return match_counts

def get_rivalries(match_df):
    player_opponents = pd.concat(
        [
            match_df[['winner_id','winner_name', 'surface','winner_rank', 'loser_name','loser_id']]
            .rename(columns={'winner_name': 'player_name', 'winner_id':'player_id', 'winner_rank': 'rank', 'loser_name': 'opponent', 'loser_id': 'opponent_id'}),
    
            match_df[['loser_name','loser_id', 'surface', 'loser_rank', 'winner_name', 'winner_id']]
            .rename(columns={'loser_name': 'player_name', 'loser_id':'player_id', 'loser_rank': 'rank', 'winner_name': 'opponent', 'winner_id':'opponent_id'})
        ],
        ignore_index=True
    )

    match_counts = (
        player_opponents.groupby(['player_id','player_name', 'opponent', 'opponent_id','surface'])
        .size()
        .reset_index(name='match_count')
    )
    
    top_opponents = (
        match_counts.sort_values(['player_id','match_count'], ascending=[True, False])
            .groupby(['player_id'])
        .head(10)
    )
    return top_opponents

def player_performance(df):
    round_order = ['RR', 'BR', 'ER', 'R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F']
    round_dtype = CategoricalDtype(categories=round_order, ordered=True)

    df['round'] = df['round'].astype(round_dtype)

    rounds = df.groupby(['winner_id','winner_name', 'tourney_year', 'tourney_level', 'tourney_name'])[
        'round'].max().reset_index()
    rounds = rounds.groupby(['winner_id','winner_name', 'tourney_year', 'tourney_level', 'round'],
                            observed=True).size().reset_index(name='match_count')
    max_rank_points = df.groupby(['winner_id','winner_name', 'tourney_year']).agg(
        best_rank=('winner_rank', 'min')).reset_index()
    player_perf = pd.merge(rounds, max_rank_points, on=['winner_id','winner_name', 'tourney_year'])
    player_perf['titles'] = player_perf.apply(lambda x: 0 if x['round'] != 'F' else x['match_count'], axis=1)
    player_perf.rename(columns={'winner_id': 'player_id', 'winner_name':'player_name'}, inplace=True)
    return player_perf



def match_breakdown_surface_tourney(df, threshold=3):
    count_sunburst = df.groupby(
        ['winner_id', 'winner_name', 'surface', 'tourney_level', 'tourney_name']).size().reset_index(name='count')
    count_sunburst.loc[count_sunburst['count'] <=threshold, 'tourney_name'] = 'Other'
    return count_sunburst.groupby(['winner_id','winner_name', 'surface', 'tourney_level', 'tourney_name']).sum('count').reset_index().rename(columns={'winner_id': 'player_id', 'winner_name':'player_name'})

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
        statsDf= df.groupby(['winner_id','winner_name', 'surface'])[["ace_pct", '1stIn_pct', '1stWon_pct', '2ndWon_pct', 'df_pct', 'bpSaved_pct']].mean().reset_index()
    else: 
        statsDf= df.groupby(['winner_id','winner_name'])[["ace_pct", '1stIn_pct', '1stWon_pct', '2ndWon_pct', 'df_pct', 'bpSaved_pct']].mean().reset_index()
    statsDf.rename(columns={'winner_id': 'player_id', 'winner_name':'player_name'}, inplace=True)
    return statsDf


def main():
    # CSV files for Find Your Player filtering
    get_filter_player_data(men_matches,atp_players).to_csv('../data/atp_filter_player_data.csv')
    get_filter_player_data(women_matches,wta_players).to_csv('../data/wta_filter_player_data.csv')

    # CSV files for biggest rivals per player
    get_rivalries(men_matches).to_csv('../data/atp_rivalries.csv')
    get_rivalries(women_matches).to_csv('../data/wta_rivalries.csv')

    # CSV files for key data for player profile
    get_player_profiles(men_matches, atp_players).to_csv('../data/atp_player_profile.csv')
    get_player_profiles(women_matches, wta_players).to_csv('../data/wta_player_profile.csv')

    # CSV files for career overview chart
    player_performance(women_matches).to_csv('../data/wta_player_perf.csv')
    player_performance(men_matches).to_csv('../data/atp_player_perf.csv')

    # CSV files for surface win rates
    surface_win_rates(men_matches).to_csv('../data/atp_win_rates.csv')
    surface_win_rates(women_matches).to_csv('../data/wta_win_rates.csv')

    # CSV files for sunburst chart of matches won per surface-tournament
    match_breakdown_surface_tourney(men_matches).to_csv('../data/atp_prop_surface.csv')
    match_breakdown_surface_tourney(women_matches).to_csv('../data/wta_prop_surface.csv')

    # CSV files for radar chart of statistics
    compute_all_stats(men_matches).to_csv('../data/atp_player_stats.csv')
    compute_all_stats(women_matches).to_csv('../data/wta_player_stats.csv')

    # CSV file with unique players for both ATP & WTA
    get_unique_players(men_matches, atp_players, women_matches, wta_players).to_csv('../data/all_players.csv')