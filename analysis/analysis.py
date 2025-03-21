import pandas as pd
import numpy as np
import tqdm
import matplotlib.pyplot as plt
import seaborn as sns

ATP_DATASET_PATH="../../tennis_atp/"
WTA_DATASET_PATH="../../tennis_wta/"

player_ds = pd.read_csv(f"{ATP_DATASET_PATH}/atp_players.csv")
player_names = player_ds["name_first"] + ' ' + player_ds["name_last"]

matches_dss = []
for year in tqdm.tqdm(range(1991, 2024)):
    df = pd.read_csv(f"{ATP_DATASET_PATH}/atp_matches_{year}.csv")
    matches_dss.append(df)
all_matches = pd.concat(matches_dss, ignore_index=True)



w_player_ds = pd.read_csv(f"{WTA_DATASET_PATH}/wta_players.csv")

w_matches_dss = []
for year in tqdm.tqdm(range(1991, 2024)):
    df = pd.read_csv(f"{WTA_DATASET_PATH}/wta_matches_{year}.csv")
    w_matches_dss.append(df)
w_all_matches = pd.concat(w_matches_dss, ignore_index=True)


def plot_basic_stats(matches=all_matches, players=player_ds, title="ATP"):
    stats = {
        'Number of games': len(matches),
        'Mean age of winner': round(matches['winner_age'].mean(), 1),
        'Mean age of loser': round(matches['loser_age'].mean(), 1),
        'Number of players': len(players),
    }
    stats_list = [(key, value) for key, value in stats.items()]

    fig, ax = plt.subplots(figsize=(4, 2))
    ax.axis('off')
    plt.title(f"Basic statistics for the {title} matches\nfrom 1991 to 2024")
    table = ax.table(cellText=stats_list, loc='center', colColours=['#f1f1f1']*len(stats_list))

    table.scale(1.2, 1.2)  # Adjust table size
    plt.savefig(f'basic_stats_{title}.svg', format='svg', bbox_inches='tight')
    #plt.show()


def plot_percentage_wins(matches=all_matches, players=player_ds, title="men"):
    winner_counts = matches['winner_id'].value_counts()
    winner_counts.name = 'win_count'
    loser_counts = matches['loser_id'].value_counts()
    loser_counts.name = 'loose_count'
    win_loose_counts = pd.merge(winner_counts, loser_counts, how='outer', left_index=True, right_index=True).fillna(0)
    win_loose_counts = win_loose_counts[win_loose_counts["win_count"] + win_loose_counts["loose_count"] > 50]
    win_percentage = (win_loose_counts['win_count'] / (win_loose_counts['win_count'] + win_loose_counts['loose_count'])) * 100
    win_percentage.name = 'percentage_win'
    win_percentage = pd.merge(win_percentage, players, left_index=True, right_on='player_id', how='left').sort_values(by="percentage_win", ascending=False)


    fig, ax = plt.subplots(figsize=(4, 4))
    ax.axis('off')
    plt.title(f"Percentage of tour-level matches won 1991 - 2024: top 10\n{title} players that played at least 50 times")
    win_percentage["name"] = win_percentage["name_first"] + ' ' + win_percentage["name_last"]
    df_top10 = win_percentage.head(10)[['name', 'percentage_win']]
    df_top10['percentage_win'] = df_top10['percentage_win'].round(2)
    # Create a table from the DataFrame
    table = ax.table(cellText=df_top10.values, colLabels=df_top10.columns, loc='center', cellLoc='center', colColours=['#f1f1f1']*df_top10.shape[1])

    # Style the table for better appearance
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1.2, 1.2)  # Adjust table size
    plt.savefig(f'percentage_win_{title}.svg', format='svg', bbox_inches='tight')
    #plt.show()


def plot_nationalities(players=player_ds, title = 'men'):
    nationality_counts = players['ioc'].value_counts()
    top_nationalities = nationality_counts.head(11)
    other_count = nationality_counts.tail(nationality_counts.size - 11).sum()
    top_nationalities['Others'] = other_count

    plt.figure(figsize=(4, 6))

    colors = plt.cm.Paired(range(len(top_nationalities)))  # Generate distinct colors

    # Plot each nationality as a stacked segment in a single bar
    bottom = 0
    for i, nationality in enumerate(top_nationalities.index):
        plt.bar('Total', top_nationalities[nationality], bottom=bottom, color=colors[i], label=nationality)
        bottom += top_nationalities[nationality]  # Update bottom to stack the next segment


    plt.ylabel('Number of Players')
    plt.title(f'Composition of {title} Players per Nationality')
    plt.legend(title="Nationalities", bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.legend

    plt.savefig(f'nationalities_{title}.svg', format='svg', bbox_inches='tight')
    #plt.show()

plot_basic_stats()
plot_percentage_wins()
plot_nationalities()
plot_basic_stats(w_all_matches, w_player_ds, "WTA")
plot_percentage_wins(w_all_matches, w_player_ds, "women")
plot_nationalities(w_player_ds, "women")

# plt.figure(figsize=(10, 6))
# sns.barplot(x=top_nationalities.index, y=top_nationalities.values, palette='viridis')
# plt.xlabel('Nationality')
# plt.ylabel('Number of Players')
# plt.title('Number of Players per Nationality')
# plt.xticks(rotation=45)  # Rotate x labels for better visibility
# plt.show()